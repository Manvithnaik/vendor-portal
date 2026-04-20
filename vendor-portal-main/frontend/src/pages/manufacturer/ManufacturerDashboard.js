import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import Toast from '../../components/common/Toast';
import { Search, AlertCircle, PackageCheck, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import KPICard from '../../components/analytics/KPICard';
import { BarChartDistribution, LineChartTrend } from '../../components/analytics/AnalyticsCharts';

const ManufacturerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartToggle, setChartToggle] = useState('products'); // 'products' or 'vendors'
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Only fetch overview. Orders will be displayed via recent_activity now.
        const analyticRes = await analyticsService.getManufacturerOverview(user.org_id, timeRange);
        setAnalytics(analyticRes?.data || null);
      } catch (err) {
        setToast({ message: err.message || 'Failed to load dashboard insights', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    if (user?.org_id) {
      loadData();
    }
  }, [user, timeRange]);

  if (loading) {
    return <div className="p-8 text-center text-brand-400">Loading your insight dashboard...</div>;
  }

  const data = analytics || { kpis: {}, charts: {}, alerts: [], recent_activity: [] };
  const kpis = data.kpis || {};

  // Build KPI objects for KPICard
  const kpiList = [
    {
      label: "Total Orders",
      value: kpis.total_orders || 0,
      trend: kpis.trends?.orders_change || 0,
      comparison: `vs previous ${timeRange.replace('d', ' days')}`,
      insight: kpis.insights?.orders_driver || "Stable order volume"
    },
    {
      label: "Procurement Spend",
      value: kpis.total_spend || 0,
      trend: kpis.trends?.spend_change || 0,
      comparison: `vs previous ${timeRange.replace('d', ' days')}`,
      insight: kpis.insights?.spend_driver || "Stable procurement execution"
    },
    {
      label: "Supplier Score",
      value: kpis.supplier_score || 0,
      trend: 0,
      comparison: "on-time delivery rating",
      insight: kpis.insights?.supplier_driver || `Vendors deliver at a ${kpis.supplier_score || 100}% reliability.`
    }
  ];

  const handleInsightClick = (type) => {
    switch (type) {
      case 'delayed':
        navigate('/manufacturer/orders?status=processing');
        break;
      case 'nearing':
        navigate('/manufacturer/orders?status=shipped');
        break;
      default:
        navigate('/manufacturer/orders');
    }
  };

  const getAlertIcon = (severity, type) => {
    if (severity === 'high') return <AlertTriangle className="text-red-600" size={18} />;
    if (type === 'nearing') return <Clock className="text-yellow-600" size={18} />;
    if (severity === 'good') return <PackageCheck className="text-green-600" size={18} />;
    return <TrendingUp className="text-yellow-600" size={18} />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-900">Welcome back, {user.name || 'Manufacturer'}</h1>
          <p className="text-sm text-brand-400 mt-1">Here is your procurement action center.</p>
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
          <Link to="/manufacturer/browse" className="btn-primary py-2 px-4 shadow-sm h-10 flex items-center gap-2">
            <Search size={16} /> Procure Materials
          </Link>
        </div>
      </div>

      {/* Layer 2: Action Insights */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="bg-surface-50 border border-surface-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-brand-800 font-semibold mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-brand-500"/> Action Required
          </h3>
          <div className="flex flex-wrap gap-3">
            {data.alerts.map((alert, i) => {
              const bgClass = alert.severity === 'high' ? 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100 shadow-sm' : 
                              alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100' :
                              'bg-green-50 border-green-200 text-green-800 hover:bg-green-100';
              return (
                <button 
                  key={i} 
                  onClick={() => handleInsightClick(alert.type)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${bgClass}`}
                >
                  {getAlertIcon(alert.severity, alert.type)}
                  {alert.message}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Layer 1: Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiList.map((kpi, i) => <KPICard key={i} kpi={kpi} />)}
      </div>

      {/* Layer 3: Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {data.charts?.spend_trend ? (
            <LineChartTrend 
              data={data.charts.spend_trend} 
              dataKey="value"
              xKey="date"
              title="Spend Over Time"
            />
          ) : (
            <div className="card p-8 h-64 flex flex-col items-center justify-center text-center text-sm text-brand-400 border border-dashed">
              <span>Spend Timeline Unavailable</span>
            </div>
          )}
        </div>

        <div>
           {data.charts && (
              <div className="card h-full p-5 flex flex-col relative">
                <div className="flex items-center justify-between z-10 relative mb-4">
                  <h3 className="font-display font-semibold text-brand-900">Top Performers</h3>
                  <div className="bg-surface-100 p-1 rounded-md flex text-xs font-medium">
                    <button 
                      onClick={() => setChartToggle('products')}
                      className={`px-3 py-1 rounded-sm transition-all ${chartToggle === 'products' ? 'bg-white shadow-sm text-brand-800' : 'text-brand-500 hover:text-brand-700'}`}
                    >
                      Products
                    </button>
                    <button 
                      onClick={() => setChartToggle('vendors')}
                      className={`px-3 py-1 rounded-sm transition-all ${chartToggle === 'vendors' ? 'bg-white shadow-sm text-brand-800' : 'text-brand-500 hover:text-brand-700'}`}
                    >
                      Vendors
                    </button>
                  </div>
                </div>
                <div className="flex-1 -mt-10">
                  <BarChartDistribution 
                    data={chartToggle === 'products' ? data.charts.top_products : data.charts.top_vendors} 
                    dataKey="value" 
                    xKey="name" 
                    title="" 
                  />
                </div>
              </div>
           )}
        </div>
      </div>

      {/* Layer 4: Recent Activity */}
      <div className="card">
        <div className="px-5 py-4 border-b border-surface-200">
          <h2 className="font-display font-semibold text-brand-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-surface-200 p-2">
          {data.recent_activity?.length > 0 ? data.recent_activity.map(row => (
            <div key={row.order_id} className="flex justify-between items-center p-3 hover:bg-surface-50 rounded-lg transition-colors">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <PackageCheck size={16} className="text-brand-500" />
                  <span className="font-semibold text-brand-800">{row.product_summary}</span>
                  {row.priority === 'urgent' && (
                     <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Urgent</span>
                  )}
                </div>
                <div className="text-xs text-brand-500 font-mono ml-6">{row.order_id}</div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right flex flex-col items-end w-24">
                   <div className="font-semibold text-brand-900">₹{Number(row.amount).toLocaleString()}</div>
                   {row.eta_days !== null && row.eta_days !== undefined && (
                     <div className={`text-[11px] font-medium ${row.eta_days < 0 ? 'text-red-500' : row.eta_days <= 3 ? 'text-orange-500' : 'text-brand-500'}`}>
                       <Clock size={10} className="inline mr-1"/>
                       {row.eta_days < 0 ? 'Delayed' : `ETA: ${row.eta_days}d`}
                     </div>
                   )}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider text-center w-28
                  ${row.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                    row.status === 'processing' || row.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-surface-100 text-brand-600'}
                `}>
                  {row.status === 'processing' ? 'In Transit' : row.status}
                </span>
              </div>
            </div>
          )) : (
            <div className="p-6 text-center text-sm text-brand-400">No recent orders found.</div>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default ManufacturerDashboard;
