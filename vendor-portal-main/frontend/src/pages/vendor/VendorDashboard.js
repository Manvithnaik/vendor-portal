import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import Toast from '../../components/common/Toast';
import { Package, AlertTriangle, Clock, Target, TrendingUp, PackageCheck } from 'lucide-react';
import KPICard from '../../components/analytics/KPICard';
import { LineChartTrend } from '../../components/analytics/AnalyticsCharts';

const VendorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const analyticRes = await analyticsService.getVendorOverview(user.org_id, timeRange);
        setAnalytics(analyticRes?.data || null);
      } catch (err) {
        setToast({ message: err.message || 'Failed to load dashboard metrics', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    if (user?.org_id) {
      loadData();
    }
  }, [user, timeRange]);

  if (loading) {
    return <div className="p-8 text-center text-brand-400">Compiling your performance analytics...</div>;
  }

  // Fallback state
  const data = analytics || { 
    kpis: {}, 
    alerts: [], 
    charts: {}, 
    active_orders: [], 
    rfq_summary: {} 
  };

  const kpis = data.kpis || {};

  // Build KPI objects dynamically
  const kpiList = [
    {
      label: "Total Revenue",
      value: kpis.revenue?.value || 0,
      trend: kpis.revenue?.change_pct || 0,
      comparison: `vs previous period`,
      insight: kpis.revenue?.insight || "Stable revenue pipeline"
    },
    {
      label: "Orders Completed",
      value: kpis.orders_completed?.value || 0,
      trend: kpis.orders_completed?.change_pct || 0,
      comparison: `vs previous period`,
      insight: kpis.orders_completed?.insight || "Stable fulfillment volume"
    },
    {
      label: "RFQs Responded",
      value: kpis.rfqs_responded?.value || 0,
      trend: kpis.rfqs_responded?.change_pct || 0,
      comparison: `vs previous period`,
      insight: kpis.rfqs_responded?.insight || "Average response time: N/A"
    },
    {
      label: "Conversion Rate",
      value: kpis.conversion_rate?.value > 0 ? `${(kpis.conversion_rate.value * 100).toFixed(1)}%` : '0%',
      trend: kpis.conversion_rate?.change_pct || 0,
      comparison: `Quote-to-Order ratio`,
      insight: kpis.conversion_rate?.insight || "Improve your pricing to win more RFQs!"
    }
  ];

  const getAlertIcon = (type) => {
    if (type === 'overdue' || type === 'performance_drop') return <AlertTriangle className="text-red-500" size={18} />;
    if (type === 'due_soon') return <Clock className="text-orange-500" size={18} />;
    return <Target className="text-brand-500" size={18} />;
  };

  const activeOrders = data.active_orders || [];
  const alerts = data.alerts || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-900">Operations Center</h1>
          <p className="text-sm text-brand-400 mt-1">Here is your {timeRange.replace('d', ' Day')} performance benchmark.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="input-field h-10 py-0 text-sm font-medium border-surface-200"
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
          >
             <option value="7d">Last 7 Days</option>
             <option value="30d">Last 30 Days</option>
             <option value="90d">Last 90 Days</option>
          </select>
          <Link to="/vendor/products" className="btn-primary py-2 px-4 shadow-sm h-10 flex items-center gap-2">
            <Package size={16} /> Manage Items
          </Link>
        </div>
      </div>

      {/* Layer 2: Action Insights */}
      {(alerts.length > 0 || (data.rfq_summary && data.rfq_summary.pending_count > 0)) && (
        <div className="bg-surface-50 border border-surface-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-brand-800 font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-brand-500"/> Action Required
          </h3>
          <div className="flex flex-wrap gap-3">
            {alerts.map((alert, i) => {
              const bgClass = alert.severity === 'high' ? 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100 shadow-sm' : 
                              alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100' :
                              'bg-green-50 border-green-200 text-green-800 hover:bg-green-100';
              return (
                <button 
                  key={i} 
                  onClick={() => alert.cta && navigate(alert.cta)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${bgClass}`}
                >
                  {getAlertIcon(alert.type)}
                  {alert.message}
                </button>
              );
            })}
            
            {alerts.length === 0 && data.rfq_summary.pending_count > 0 && (
               <button 
                  onClick={() => navigate('/vendor/rfqs?status=pending')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100`}
                >
                  <Target className="text-yellow-600" size={18} />
                  {data.rfq_summary.pending_count} pending RFQs (Oldest: {data.rfq_summary.oldest_pending_days} days)
               </button>
            )}
          </div>
        </div>
      )}

      {/* Layer 1: Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiList.map((kpi, i) => <KPICard key={i} kpi={kpi} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Layer 3: Analytics Visualizations */}
        <div className="col-span-2">
          {data.charts?.revenue_trend && data.charts.revenue_trend.length > 0 ? (
            <LineChartTrend 
              data={data.charts.revenue_trend} 
              dataKey="value" 
              xKey="date" 
              title="Revenue Trajectory" 
            />
          ) : (
            <div className="card p-8 h-64 flex flex-col items-center justify-center text-center text-sm text-brand-400 border border-dashed border-surface-300">
              <span className="font-semibold text-brand-500 mb-1">No Revenue Data</span>
              <span>There is no completed purchase order revenue in this timeframe.</span>
            </div>
          )}
        </div>

        {/* Layer 4: Active Orders Panel */}
        <div className="col-span-1">
          <div className="card h-full flex flex-col">
            <div className="px-5 py-4 border-b border-surface-200">
              <h2 className="font-display font-semibold text-brand-900">Active Pipeline</h2>
            </div>
            <div className="divide-y divide-surface-200 overflow-y-auto flex-1">
              {activeOrders.map(row => (
                <div key={row.order_id} className="p-4 hover:bg-surface-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-brand-800">{row.product_summary}</span>
                        {row.priority === 'urgent' && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Urgent</span>
                        )}
                     </div>
                     <div className="text-right">
                       <span className="text-sm font-bold text-brand-900">₹{Number(row.amount).toLocaleString()}</span>
                     </div>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-brand-500">{row.manufacturer_name}</span>
                      {row.eta_days !== null && row.eta_days !== undefined && (
                        <div className={`text-[11px] font-medium flex items-center gap-1 ${row.eta_days < 0 ? 'text-red-500' : row.eta_days <= 3 ? 'text-orange-500' : 'text-brand-500'}`}>
                          <Clock size={10} />
                          {row.eta_days < 0 ? 'Overdue' : `ETA: ${row.eta_days}d`}
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider
                      ${row.status === 'processing' ? 'bg-blue-50 text-blue-700' : 'bg-surface-100 text-brand-600'}
                    `}>
                      {row.status === 'processing' ? 'In Transit' : row.status}
                    </span>
                  </div>
                </div>
              ))}
              {activeOrders.length === 0 && (
                <div className="p-10 flex flex-col items-center justify-center text-center text-brand-400">
                   <PackageCheck size={32} className="mb-2 opacity-50" />
                   <span className="text-sm">Inbox Zero! No active orders.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default VendorDashboard;
