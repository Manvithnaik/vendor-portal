import logging
from sqlalchemy import text
from app.utils.date_utils import parse_date_range, calculate_trend
import time

class NativeTTLCache:
    def __init__(self, ttl):
        self.ttl = ttl
        self.cache = {}

    def get(self, key):
        if key in self.cache:
            item, exp = self.cache[key]
            if time.time() < exp:
                return item
            del self.cache[key]
        return None

    def set(self, key, value):
        self.cache[key] = (value, time.time() + self.ttl)
        
class AnalyticsService:
    _vendor_cache = NativeTTLCache(ttl=300)

    def __init__(self, db):
        self.db = db

    def generate_insight(self, metric_name, value, trend, invert_good=False):
        if trend > 5:
            return f"{metric_name} grew by {trend}% compared to the previous period." if not invert_good else f"Warning: {metric_name} increased by {trend}%."
        elif trend < -5:
            return f"{metric_name} dropped by {abs(trend)}%, indicating a potential slowdown." if not invert_good else f"{metric_name} improved by dropping {abs(trend)}%."
        return f"{metric_name} remained stable with minimal changes."

    def build_kpi(self, key, label, current_val, prev_val, invert_good=False):
        trend = calculate_trend(current_val, prev_val)
        return {
            "key": key,
            "label": label,
            "value": float(current_val) if current_val else 0.0,
            "trend": trend,
            "comparison": "vs prior period",
            "insight": self.generate_insight(label, current_val, trend, invert_good)
        }

    def _get_empty_response(self, message="No data available for selected period."):
        return {"kpis": [], "charts": {}, "insights": [message], "alerts": [], "metadata": {"confidence": "low"}}

    def get_manufacturer_overview(self, org_id: int, range_str: str, from_date: str = None, to_date: str = None):
        start, end, p_start, p_end = parse_date_range(range_str, from_date, to_date)
        from datetime import timedelta, datetime
        
        # 1. KPIs (Orders & Spend)
        query = text("""
            SELECT 
                COUNT(*) FILTER (WHERE created_at BETWEEN :start AND :end) as current_orders,
                COUNT(*) FILTER (WHERE created_at BETWEEN :p_start AND :p_end) as prev_orders,
                SUM(total_amount) FILTER (WHERE created_at BETWEEN :start AND :end) as current_spend,
                SUM(total_amount) FILTER (WHERE created_at BETWEEN :p_start AND :p_end) as prev_spend
            FROM orders
            WHERE customer_org_id = :org_id
        """)
        result = self.db.execute(query, {
            "start": start, "end": end, "p_start": p_start, "p_end": p_end, "org_id": org_id
        }).fetchone()

        c_orders = int(result.current_orders) if result.current_orders else 0
        p_orders = int(result.prev_orders) if result.prev_orders else 0
        c_spend = float(result.current_spend) if result.current_spend else 0.0
        p_spend = float(result.prev_spend) if result.prev_spend else 0.0

        orders_change = calculate_trend(c_orders, p_orders)
        spend_change = calculate_trend(c_spend, p_spend)

        # Insight drivers
        orders_driver = "Stable order velocity"
        if orders_change > 0: orders_driver = "Increased overall material procurement"
        elif orders_change < 0: orders_driver = "Slowdown in new purchasing"
            
        spend_driver = "Consistent cost levels"
        if spend_change > 15: spend_driver = "High value purchases pushing spend up"
        elif spend_change < 0: spend_driver = "Reduced capital outgoing"

        # 2. Alerts (Delayed, Nearing, On Time)
        alerts = []
        if spend_change > 50:
             alerts.append({"type": "spend_spike", "count": 1, "severity": "warning", "message": f"Spend spiked by {spend_change}% (₹{p_spend:,.0f} → ₹{c_spend:,.0f})"})
             
        alert_q = text("""
            SELECT 
                COUNT(*) FILTER (WHERE expected_delivery_date < CURRENT_DATE AND status NOT IN ('delivered', 'cancelled')) as delayed_count,
                COUNT(*) FILTER (WHERE expected_delivery_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '3 days' AND status NOT IN ('delivered', 'cancelled')) as nearing_count,
                COUNT(*) FILTER (WHERE status = 'delivered') as total_del,
                COUNT(*) FILTER (WHERE status = 'delivered' AND (grn_confirmed_at IS NOT NULL AND DATE(grn_confirmed_at) <= expected_delivery_date)) as on_time_count
            FROM orders
            WHERE customer_org_id = :org_id
        """)
        alert_res = self.db.execute(alert_q, {"org_id": org_id}).fetchone()
        
        delayed_c = int(alert_res.delayed_count) if alert_res.delayed_count else 0
        nearing_c = int(alert_res.nearing_count) if alert_res.nearing_count else 0
        tot_del = int(alert_res.total_del) if alert_res.total_del else 0
        on_time = int(alert_res.on_time_count) if alert_res.on_time_count else 0
        
        if delayed_c > 0:
            alerts.append({"type": "delayed", "count": delayed_c, "severity": "high", "message": f"{delayed_c} order(s) are severely delayed"})
        if nearing_c > 0:
            alerts.append({"type": "nearing", "count": nearing_c, "severity": "warning", "message": f"{nearing_c} order(s) arriving soon"})
            
        on_time_rate = (on_time / tot_del * 100) if tot_del > 0 else 100.0
        if tot_del == 0 and delayed_c > 0:
            on_time_rate = 0.0 # If nothing delivered and things are delayed, score drops.
            
        supplier_score = round(on_time_rate, 1)
        supplier_insight = "Excellent vendor reliability"
        if supplier_score < 50:
            supplier_insight = "Severe delivery reliability issues"
        elif supplier_score < 80:
            supplier_insight = "Inconsistent on-time delivery rate"
            
        if on_time_rate > 90 and tot_del > 0:
             alerts.append({"type": "good", "count": 1, "severity": "good", "message": f"{supplier_score}% on-time deliveries"})

        # 3. Charts
        spend_trend_q = text("""
            SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as dt, SUM(total_amount) as val
            FROM orders
            WHERE customer_org_id = :org_id AND created_at BETWEEN :start AND :end
            GROUP BY dt ORDER BY dt ASC
        """)
        trend_rows = self.db.execute(spend_trend_q, {"org_id": org_id, "start": start, "end": end}).fetchall()
        trend_map = {row.dt: float(row.val) for row in trend_rows}
        
        spend_trend = []
        days = (end.date() - start.date()).days
        if days > 90: days = 90
        if days < 0: days = 0
        
        for i in range(days + 1):
            dt_str = (start.date() + timedelta(days=i)).strftime('%Y-%m-%d')
            spend_trend.append({"date": dt_str, "value": trend_map.get(dt_str, 0.0)})

        top_prod_q = text("""
            SELECT p.name, SUM(oi.quantity) as count
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            WHERE o.customer_org_id = :org_id AND o.created_at BETWEEN :start AND :end
            GROUP BY p.name ORDER BY count DESC LIMIT 5
        """)
        top_products = [{"name": r[0], "value": float(r[1])} for r in self.db.execute(top_prod_q, {"org_id": org_id, "start": start, "end": end}).fetchall()]

        top_vend_q = text("""
            SELECT org.name, SUM(o.total_amount) as spend
            FROM orders o
            JOIN organizations org ON org.id = o.manufacturer_org_id
            WHERE o.customer_org_id = :org_id AND o.created_at BETWEEN :start AND :end
            GROUP BY org.name ORDER BY spend DESC LIMIT 5
        """)
        top_vendors = [{"name": r[0], "value": float(r[1])} for r in self.db.execute(top_vend_q, {"org_id": org_id, "start": start, "end": end}).fetchall()]

        # 4. Recent Activity
        recent_q = text("""
            SELECT o.id as o_id, o.order_number, o.total_amount, o.status, 
                   o.expected_delivery_date, o.priority,
                   (SELECT p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as prod_name,
                   (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as prod_count
            FROM orders o
            WHERE o.customer_org_id = :org_id
            ORDER BY o.created_at DESC LIMIT 6
        """)
        recent_rows = self.db.execute(recent_q, {"org_id": org_id}).fetchall()
        
        recent_activity = []
        for r in recent_rows:
            p_name = r.prod_name or 'Purchase Order'
            p_count = int(r.prod_count) if r.prod_count else 0
            if p_count > 1:
                p_name += f" (+{p_count-1} more)"
            
            eta_days = None
            if r.expected_delivery_date:
                eta_days = (r.expected_delivery_date - datetime.utcnow().date()).days
                
            recent_activity.append({
                "order_id": r.order_number,
                "product_summary": p_name,
                "amount": float(r.total_amount) if r.total_amount else 0.0,
                "status": getattr(r.status, 'name', str(r.status)),
                "eta_days": eta_days,
                "priority": getattr(r.priority, 'name', str(r.priority))
            })

        return {
            "kpis": {
                "total_orders": c_orders,
                "total_spend": c_spend,
                "supplier_score": supplier_score,
                "trends": {
                    "orders_change": orders_change,
                    "spend_change": spend_change
                },
                "insights": {
                    "orders_driver": orders_driver,
                    "spend_driver": spend_driver,
                    "supplier_driver": supplier_insight
                }
            },
            "alerts": alerts,
            "charts": {
                "spend_trend": spend_trend,
                "top_products": top_products,
                "top_vendors": top_vendors
            },
            "recent_activity": recent_activity
        }

    def get_vendor_overview(self, org_id: int, range_str: str, from_date: str = None, to_date: str = None):
        from datetime import timedelta, datetime
        
        cache_key = f"{org_id}_{range_str}_{from_date}_{to_date}"
        cached_result = AnalyticsService._vendor_cache.get(cache_key)
        if cached_result:
            return cached_result
            
        start, end, p_start, p_end = parse_date_range(range_str, from_date, to_date)
        
        # 1. KPIs
        query = text("""
            SELECT 
                COUNT(*) FILTER (WHERE created_at BETWEEN :start AND :end) as current_quotes,
                COUNT(*) FILTER (WHERE created_at BETWEEN :p_start AND :p_end) as prev_quotes
            FROM quotes
            WHERE manufacturer_org_id = :org_id
        """)
        q_result = self.db.execute(query, {"start": start, "end": end, "p_start": p_start, "p_end": p_end, "org_id": org_id}).fetchone()

        order_query = text("""
            SELECT 
                COUNT(*) FILTER (WHERE created_at BETWEEN :start AND :end) as current_orders,
                COUNT(*) FILTER (WHERE created_at BETWEEN :p_start AND :p_end) as prev_orders,
                SUM(total_amount) FILTER (WHERE created_at BETWEEN :start AND :end) as current_rev,
                SUM(total_amount) FILTER (WHERE created_at BETWEEN :p_start AND :p_end) as prev_rev
            FROM orders
            WHERE manufacturer_org_id = :org_id
        """)
        order_result = self.db.execute(order_query, {"start": start, "end": end, "p_start": p_start, "p_end": p_end, "org_id": org_id}).fetchone()

        c_rev = float(order_result.current_rev) if order_result.current_rev else 0.0
        p_rev = float(order_result.prev_rev) if order_result.prev_rev else 0.0
        c_orders = int(order_result.current_orders) if order_result.current_orders else 0
        p_orders = int(order_result.prev_orders) if order_result.prev_orders else 0
        c_quotes = int(q_result.current_quotes) if q_result.current_quotes else 0
        p_quotes = int(q_result.prev_quotes) if q_result.prev_quotes else 0

        c_conv = (c_orders / c_quotes) if c_quotes > 0 else 0
        p_conv = (p_orders / p_quotes) if p_quotes > 0 else 0

        # Drivers
        rev_change = calculate_trend(c_rev, p_rev)
        ord_change = calculate_trend(c_orders, p_orders)
        quote_change = calculate_trend(c_quotes, p_quotes)
        conv_change = calculate_trend(c_conv, p_conv)

        # 2. Avg Response Time
        avg_q = text("""
            SELECT AVG(EXTRACT(EPOCH FROM (q.created_at - rb.sent_at))/3600) as avg_hrs
            FROM quotes q
            JOIN rfq_broadcast rb ON rb.rfq_id = q.rfq_id AND rb.manufacturer_org_id = q.manufacturer_org_id
            WHERE q.manufacturer_org_id = :org_id AND q.created_at BETWEEN :start AND :end
        """)
        avg_res = self.db.execute(avg_q, {"org_id": org_id, "start": start, "end": end}).fetchone()
        avg_resp_hrs = round(float(avg_res.avg_hrs), 1) if avg_res and avg_res.avg_hrs else 0.0

        # 3. Alerts
        alert_q = text("""
            SELECT 
                COUNT(*) FILTER (WHERE expected_delivery_date < CURRENT_DATE AND status NOT IN ('delivered', 'cancelled')) as overdue_count,
                COUNT(*) FILTER (WHERE expected_delivery_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '3 days' AND status NOT IN ('delivered', 'cancelled')) as due_soon_count,
                COUNT(*) FILTER (WHERE status = 'delivered') as total_del,
                COUNT(*) FILTER (WHERE status = 'delivered' AND (grn_confirmed_at IS NOT NULL AND DATE(grn_confirmed_at) <= expected_delivery_date)) as on_time_count
            FROM orders
            WHERE manufacturer_org_id = :org_id AND created_at BETWEEN :start AND :end
        """)
        a_res = self.db.execute(alert_q, {"org_id": org_id, "start": start, "end": end}).fetchone()
        
        overdue_c = int(a_res.overdue_count) if a_res.overdue_count else 0
        due_soon_c = int(a_res.due_soon_count) if a_res.due_soon_count else 0
        tot_del = int(a_res.total_del) if a_res.total_del else 0
        on_time = int(a_res.on_time_count) if a_res.on_time_count else 0
        
        on_time_rate = (on_time / tot_del) if tot_del > 0 else (1.0 if overdue_c == 0 else 0.0)

        # Pending RFQs
        rfq_q = text("""
            SELECT COUNT(*) as pending_count, MIN(sent_at) as oldest_sent
            FROM rfq_broadcast
            WHERE manufacturer_org_id = :org_id AND responded = false
        """)
        rfq_res = self.db.execute(rfq_q, {"org_id": org_id}).fetchone()
        pending_rfqs = int(rfq_res.pending_count) if rfq_res.pending_count else 0
        
        oldest_pending_days = 0
        if rfq_res.oldest_sent:
            oldest_pending_days = (datetime.utcnow().date() - rfq_res.oldest_sent.date()).days

        alerts = []
        if overdue_c > 0:
            alerts.append({"type": "overdue", "count": overdue_c, "severity": "high", "message": f"{overdue_c} order(s) overdue", "cta": "/vendor/orders?status=processing"})
        if due_soon_c > 0:
            alerts.append({"type": "due_soon", "count": due_soon_c, "severity": "medium", "message": f"{due_soon_c} order(s) due soon", "cta": "/vendor/orders?status=processing"})
        if pending_rfqs > 0:
            alerts.append({"type": "rfq_pending", "count": pending_rfqs, "severity": "medium", "message": f"{pending_rfqs} pending RFQs", "cta": "/vendor/rfqs"})
        if on_time_rate < 0.85 and tot_del > 0:
            alerts.append({"type": "performance_drop", "count": 1, "severity": "high", "message": f"On-time rate dropped to {int(on_time_rate*100)}%", "cta": "/vendor/analytics"})

        # 4. Charts - Spend Trend (Zero Filled)
        spend_trend_q = text("""
            SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as dt, SUM(total_amount) as val
            FROM orders
            WHERE manufacturer_org_id = :org_id AND created_at BETWEEN :start AND :end
            GROUP BY dt ORDER BY dt ASC
        """)
        trend_rows = self.db.execute(spend_trend_q, {"org_id": org_id, "start": start, "end": end}).fetchall()
        trend_map = {row.dt: float(row.val) for row in trend_rows}
        
        revenue_trend = []
        days = (end.date() - start.date()).days
        if days > 90: days = 90
        if days < 0: days = 0
        
        for i in range(days + 1):
            dt_str = (start.date() + timedelta(days=i)).strftime('%Y-%m-%d')
            revenue_trend.append({"date": dt_str, "value": trend_map.get(dt_str, 0.0)})

        # 5. Recent Active Orders
        recent_q = text("""
            SELECT o.id as o_id, o.order_number, o.total_amount, o.status, 
                   o.expected_delivery_date, o.priority, org.name as manufacturer_name,
                   (SELECT p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id LIMIT 1) as prod_name,
                   (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as prod_count
            FROM orders o
            JOIN organizations org ON org.id = o.customer_org_id
            WHERE o.manufacturer_org_id = :org_id AND o.status NOT IN ('delivered', 'cancelled')
            ORDER BY o.created_at DESC LIMIT 6
        """)
        recent_rows = self.db.execute(recent_q, {"org_id": org_id}).fetchall()
        
        active_orders = []
        for r in recent_rows:
            p_name = r.prod_name or 'Order'
            p_count = int(r.prod_count) if r.prod_count else 0
            if p_count > 1: p_name += f" (+{p_count-1} more)"
            
            eta_days = None
            if r.expected_delivery_date:
                eta_days = (r.expected_delivery_date - datetime.utcnow().date()).days
                
            active_orders.append({
                "order_id": r.o_id,
                "order_number": r.order_number,
                "product_summary": p_name,
                "manufacturer_name": r.manufacturer_name,
                "amount": float(r.total_amount) if r.total_amount else 0.0,
                "status": getattr(r.status, 'name', str(r.status)),
                "eta_days": eta_days,
                "priority": getattr(r.priority, 'name', str(r.priority))
            })

        return {
            "range": range_str,
            "kpis": {
                "revenue": {"value": c_rev, "change_pct": rev_change, "insight": f"{'Stable' if rev_change == 0 else 'Increasing' if rev_change > 0 else 'Decreasing'} monthly revenue"},
                "orders_completed": {"value": c_orders, "change_pct": ord_change, "insight": "Volume of executed purchase orders"},
                "rfqs_responded": {"value": c_quotes, "change_pct": quote_change, "insight": f"Average response time: {avg_resp_hrs} hrs"},
                "conversion_rate": {"value": c_conv, "change_pct": conv_change, "insight": f"Converting {round(c_conv*100, 1)}% of your quotes"}
            },
            "alerts": alerts,
            "charts": {
                "revenue_trend": revenue_trend,
                "delivery_performance": { "on_time": on_time_rate, "delayed": 1.0 - on_time_rate }
            },
            "active_orders": active_orders,
            "rfq_summary": {
                "pending_count": pending_rfqs,
                "oldest_pending_days": oldest_pending_days
            }
        }
        
        AnalyticsService._vendor_cache.set(cache_key, output)
        return output
