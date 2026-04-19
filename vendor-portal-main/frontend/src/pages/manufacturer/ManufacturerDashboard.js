import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';
import Toast from '../../components/common/Toast';
import { Search, AlertCircle } from 'lucide-react';
import KPICard from '../../components/analytics/KPICard';
import { BarChartDistribution } from '../../components/analytics/AnalyticsCharts';

const ManufacturerDashboard = () => {
  const { user } = useAuth();
  const [toast, setToast] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Parallel fetching
        const [analyticRes, orderRes] = await Promise.all([
          analyticsService.getManufacturerOverview(user.org_id, '30d'),
          orderService.listOrders()
        ]);
        setAnalytics(analyticRes?.data || null);
        setOrders(orderRes?.data || []);
      } catch (err) {
        setToast({ message: err.message || 'Failed to load dashboard arrays', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    if (user?.org_id) {
      loadData();
    }
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center text-brand-400">Loading your insight dashboard...</div>;
  }

  // Fallback to empty standard response format if API failed completely
  const data = analytics || { kpis: [], charts: {}, insights: [], alerts: [] };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-900">Welcome back, {user.name || 'Manufacturer'}</h1>
          <p className="text-sm text-brand-400 mt-1">Here is your 30-day procurement performance overview.</p>
        </div>
        <Link to="/manufacturer/browse" className="btn-primary py-2 px-4 shadow-sm h-10 flex items-center gap-2">
          <Search size={16} /> Procure Materials
        </Link>
      </div>

      {/* System Alerts */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <h3 className="text-red-800 font-semibold mb-2 flex items-center gap-2"><AlertCircle size={18} /> Required Actions</h3>
          <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
            {data.alerts.map((alert, i) => <li key={i}>{alert}</li>)}
          </ul>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.kpis && data.kpis.length > 0 ? (
           data.kpis.map((kpi, i) => <KPICard key={i} kpi={kpi} />)
        ) : (
           <div className="col-span-full card p-8 text-center text-brand-500">No Key Performance Indicators found for this timeframe.</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="col-span-2">
          {data.charts?.top_products && data.charts.top_products.length > 0 ? (
            <BarChartDistribution 
              data={data.charts.top_products} 
              dataKey="value" 
              xKey="name" 
              title="Top Ordered Products (Last 30 Days)" 
            />
          ) : (
            <div className="card p-8 h-64 flex flex-col items-center justify-center text-center text-sm text-brand-400 border border-dashed border-surface-300">
              <span className="font-semibold text-brand-500">Supply Chart Unavailable</span>
              <span className="text-xs pt-1">No products were ordered within the selected 30-day timeframe. To see analytics, try generating new orders!</span>
            </div>
          )}
        </div>

        {/* Live List */}
        <div className="col-span-1">
          <div className="card h-full">
            <div className="px-5 py-4 border-b border-surface-200">
              <h2 className="font-display font-semibold text-brand-900">Recent POs</h2>
            </div>
            <div className="divide-y divide-surface-200 overflow-y-auto max-h-[300px]">
              {orders.slice(0, 5).map(o => (
                <div key={o.id} className="px-5 py-3 hover:bg-surface-50 transition-colors">
                  <div className="flex justify-between mb-1">
                    <p className="text-sm font-medium text-brand-800 truncate">{o.productName || o.order_number}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      o.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-brand-50 text-brand-600'
                    }`}>
                      {o.status}
                    </span>
                  </div>
                  <p className="text-xs text-brand-400">Qty: {o.quantity} • ${Number(o.total_amount).toLocaleString()}</p>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="p-6 text-center text-sm text-brand-400">No live orders.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default ManufacturerDashboard;
