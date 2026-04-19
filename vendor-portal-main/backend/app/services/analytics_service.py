import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.utils.date_utils import parse_date_range, calculate_trend

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, db: Session):
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

        kpis = [
            self.build_kpi("total_orders", "Total Orders Built", result.current_orders, result.prev_orders),
            self.build_kpi("total_spend", "Procurement Spend", result.current_spend, result.prev_spend)
        ]

        delay_query = text("""
            SELECT 
                COUNT(*) as total_shipped,
                COUNT(*) FILTER (WHERE actual_delivery_date > estimated_delivery_date) as delayed
            FROM shipments
            WHERE customer_org_id = :org_id AND status = 'delivered'
              AND created_at BETWEEN :start AND :end
        """)
        delay_res = self.db.execute(delay_query, {"start": start, "end": end, "org_id": org_id}).fetchone()
        
        delay_rate = 0.0
        alerts = []
        if delay_res and delay_res.total_shipped > 0:
            delay_rate = (delay_res.delayed / delay_res.total_shipped) * 100
            if delay_res.delayed > 3:
                 alerts.append(f"{delay_res.delayed} orders delayed beyond ETA.")

        perf_score = max(0, 100 - delay_rate)

        kpis.append({
            "key": "perf_score",
            "label": "Supplier Performance Score",
            "value": perf_score,
            "trend": 0.0,
            "comparison": "0-100 Scale",
            "insight": f"Your vendors are resolving shipments at a {perf_score:.1f}/100 efficiency rating."
        })

        # Top 10 Products Chart Generation
        chart_query = text("""
            SELECT p.name, SUM(oi.quantity) as count
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            WHERE o.customer_org_id = :org_id AND o.created_at BETWEEN :start AND :end
            GROUP BY p.name
            ORDER BY count DESC
            LIMIT 5
        """)
        chart_result = self.db.execute(chart_query, {"start": start, "end": end, "org_id": org_id}).fetchall()
        top_products = [{"name": row[0], "value": int(row[1])} for row in chart_result]

        charts = {
            "top_products": top_products
        }

        return {
            "kpis": kpis,
            "charts": charts,
            "insights": [k["insight"] for k in kpis if k.get("insight")],
            "alerts": alerts,
            "metadata": {"confidence": "high" if result.current_orders > 10 else "medium"}
        }

    def get_vendor_overview(self, org_id: int, range_str: str, from_date: str = None, to_date: str = None):
        start, end, p_start, p_end = parse_date_range(range_str, from_date, to_date)
        
        query = text("""
            SELECT 
                COUNT(*) FILTER (WHERE created_at BETWEEN :start AND :end) as current_quotes,
                COUNT(*) FILTER (WHERE created_at BETWEEN :p_start AND :p_end) as prev_quotes
            FROM quotes
            WHERE manufacturer_org_id = :org_id
        """)
        result = self.db.execute(query, {
            "start": start, "end": end, "p_start": p_start, "p_end": p_end, "org_id": org_id
        }).fetchone()

        order_query = text("""
            SELECT 
                COUNT(*) FILTER (WHERE created_at BETWEEN :start AND :end) as current_orders,
                COUNT(*) FILTER (WHERE created_at BETWEEN :p_start AND :p_end) as prev_orders,
                SUM(total_amount) FILTER (WHERE created_at BETWEEN :start AND :end) as current_rev,
                SUM(total_amount) FILTER (WHERE created_at BETWEEN :p_start AND :p_end) as prev_rev
            FROM orders
            WHERE manufacturer_org_id = :org_id
        """)
        order_result = self.db.execute(order_query, {
            "start": start, "end": end, "p_start": p_start, "p_end": p_end, "org_id": org_id
        }).fetchone()

        kpis = [
            self.build_kpi("total_revenue", "Total Revenue", order_result.current_rev, order_result.prev_rev),
            self.build_kpi("total_orders", "Total Orders", order_result.current_orders, order_result.prev_orders),
            self.build_kpi("total_quotes", "Submitted Quotes", result.current_quotes, result.prev_quotes)
        ]

        conversion_rate = 0.0
        if result.current_quotes > 0:
             conversion_rate = min(100.0, (order_result.current_orders / result.current_quotes) * 100)

        kpis.append({
            "key": "conversion_rate",
            "label": "Quote Conversion Rate",
            "value": round(conversion_rate, 2),
            "trend": 0.0,
            "comparison": "Quotes to Orders",
            "insight": f"You are successfully converting {conversion_rate:.1f}% of your RFQ quotes."
        })
        
        # Revenue by Month Chart
        chart_query = text("""
            SELECT to_char(created_at, 'Mon DD') as date_label, SUM(total_amount) as amount
            FROM orders
            WHERE manufacturer_org_id = :org_id AND created_at BETWEEN :start AND :end
            GROUP BY date_label
            ORDER BY date_label ASC
        """)
        rev_trend = [{"name": row.date_label, "revenue": float(row.amount)} for row in self.db.execute(chart_query, {"start": start, "end": end, "org_id": org_id}).fetchall()]

        return {
            "kpis": kpis,
            "charts": {"revenue_trend": rev_trend},
            "insights": [k["insight"] for k in kpis if k.get("insight")],
            "alerts": [] if conversion_rate > 10 else ["Quote conversion rate is dropping below 10%. Consider price adjustments."],
            "metadata": {"confidence": "high" if order_result.current_orders > 5 else "medium"}
        }
