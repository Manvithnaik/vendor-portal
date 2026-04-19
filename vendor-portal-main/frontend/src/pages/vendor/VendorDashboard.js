import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import { orderService } from '../../services/orderService';
import Toast from '../../components/common/Toast';
import { Package, AlertTriangle } from 'lucide-react';
import KPICard from '../../components/analytics/KPICard';
import { LineChartTrend } from '../../components/analytics/AnalyticsCharts';

const VendorDashboard = () => {
  const { user } = useAuth();
  const [toast, setToast] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Parallel Async Fetch
        const [analyticRes, orderRes] = await Promise.all([
          analyticsService.getVendorOverview(user.org_id, '30d'),
          orderService.listOrders({ as_customer: false })
        ]);
        setAnalytics(analyticRes?.data || null);
        setOrders(orderRes?.data || []);
      } catch (err) {
        setToast({ message: err.message || 'Failed to load dashboard metrics', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    if (user?.org_id) {
      loadData();
    }
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center text-brand-400">Compiling your performance analytics...</div>;
  }

  const data = analytics || { kpis: [], charts: {}, insights: [], alerts: [] };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-900">Welcome back, {user.name || 'Vendor'}</h1>
          <p className="text-sm text-brand-400 mt-1">Here is your rolling 30-day performance benchmarking.</p>
        </div>
        <Link to="/vendor/products" className="btn-primary py-2 px-4 shadow-sm h-10 flex items-center gap-2">
          <Package size={16} /> Manage Products
        </Link>
      </div>

       {/* System Alerts */}
       {data.alerts && data.alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="text-yellow-800 font-semibold mb-2 flex items-center gap-2"><AlertTriangle size={18} /> Active Warnings</h3>
          <ul className="list-disc pl-5 text-sm text-yellow-700 space-y-1">
            {data.alerts.map((alert, i) => <li key={i}>{alert}</li>)}
          </ul>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.kpis && data.kpis.length > 0 ? (
           data.kpis.map((kpi, i) => <KPICard key={i} kpi={kpi} />)
        ) : (
           <div className="col-span-full card p-8 text-center text-brand-500">No Key Performance Indicators found for this timeframe.</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="col-span-2">
          {data.charts?.revenue_trend && data.charts.revenue_trend.length > 0 ? (
            <LineChartTrend 
              data={data.charts.revenue_trend} 
              dataKey="revenue" 
              xKey="name" 
              title="Revenue Trajectory (Last 30 Days)" 
            />
          ) : (
            <div className="card p-8 h-64 flex items-center justify-center text-sm text-brand-400 border border-dashed border-surface-300">
              No recent revenue data to visualize crossing threshold.
            </div>
          )}
        </div>

        {/* Live List */}
        <div className="col-span-1">
          <div className="card h-full">
            <div className="px-5 py-4 border-b border-surface-200">
              <h2 className="font-display font-semibold text-brand-900">Recent Actionable Orders</h2>
            </div>
            <div className="divide-y divide-surface-200 overflow-y-auto max-h-[300px]">
              {orders.slice(0, 5).map(o => (
                <div key={o.id} className="px-5 py-3 hover:bg-surface-50 transition-colors">
                  <div className="flex justify-between mb-1">
                    <p className="text-sm font-medium text-brand-800 truncate">{o.productName}</p>
                    <span className={`badge badge-${o.status}`}>{o.status}</span>
                  </div>
                  <p className="text-xs text-brand-400">from {o.manufacturerEmail} • ${Number(o.total_amount).toLocaleString()}</p>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="p-6 text-center text-sm text-brand-400">No pending orders.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default VendorDashboard;
