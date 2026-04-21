import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import Toast from '../../components/common/Toast';
import { Package, Clock, CheckCircle, Truck, MapPin, Calendar, Info, Box, ChevronRight, X, Search } from 'lucide-react';
import { getProductSummary } from '../../utils/orderUtils';

const analyzeOrderData = (order) => {
  // 1. Identify ID
  const id = order.id || order.order_id || order._id || order.uuid || 'Unknown';

  // 2. Identify Status
  let status = order.status || order.state;
  let inferred = false;

  // 3. Find Timestamps & Dates
  const timestamps = [];
  const futureDates = [];

  // 4. Find Numerics
  const numerics = {};

  // 5. Text / Objects
  const textFields = {};

  Object.entries(order).forEach(([key, value]) => {
    const lKey = key.toLowerCase();

    // Skip po_document_url as requested
    if (lKey === 'po_document_url') return;

    // Skip empty values
    if (value === undefined || value === null || value === '') return;

    // Dates/Timestamps
    if ((lKey.endsWith('_at') || lKey.endsWith('_date') || lKey.includes('timestamp') || lKey.includes('time') || lKey.includes('date')) 
         && typeof value === 'string' && !isNaN(Date.parse(value)) && value.length > 8 && (value.includes('T') || value.includes('-'))) {
      const dateVal = new Date(value);
      if (dateVal > new Date()) {
        futureDates.push({ key, value: dateVal, label: formatLabel(key) });
      } else {
        timestamps.push({ key, value: dateVal, label: formatLabel(key) });
      }
    }
    // Numerics
    else if (typeof value === 'number' && !lKey.includes('id')) {
      numerics[key] = value;
    }
    // Text fields
    else if (typeof value === 'string' && !lKey.includes('id') && lKey !== 'status' && lKey !== 'state') {
      textFields[key] = value;
    }
  });

  // Extract Product Info from array lists (like items, products)
  const listKeys = ['items', 'products', 'order_items', 'line_items'];
  let itemStrings = [];
  for (const lKey of listKeys) {
    if (Array.isArray(order[lKey]) && order[lKey].length > 0) {
      order[lKey].forEach((item, index) => {
        // Fallback names
        let itemName = 'Item ' + (index + 1);
        if (item.product_id) itemName = `Product #${item.product_id}`;
        
        const nameKeys = ['product_name', 'name', 'item_name', 'title'];
        for (const n of nameKeys) {
          if (typeof item[n] === 'string' && item[n].trim().length > 0) {
            itemName = item[n];
            break;
          }
        }
        let qty = item.quantity || item.qty || item.count || 1;
        itemStrings.push(`${itemName} (Qty: ${qty})`);
      });
      break; 
    }
  }
  if (itemStrings.length > 0) {
    textFields['Products Ordered'] = itemStrings.join(', ');
  }

  // Infer status if not explicit
  if (!status) {
    inferred = true;
    const hasDelivered = timestamps.some(t => t.key.toLowerCase().includes('deliver'));
    const hasShipped = timestamps.some(t => t.key.toLowerCase().includes('ship') || t.key.toLowerCase().includes('dispatch'));
    const hasAccepted = timestamps.some(t => t.key.toLowerCase().includes('accept'));

    if (hasDelivered) status = 'Delivered';
    else if (hasShipped) status = 'In Transit';
    else if (hasAccepted) status = 'Accepted';
    else status = 'Pending';
  } else {
    status = String(status).charAt(0).toUpperCase() + String(status).slice(1).replace(/_/g, ' ');
  }

  const isCompleted = status.toLowerCase() === 'delivered' || status.toLowerCase() === 'completed' || status.toLowerCase() === 'rejected' || status.toLowerCase() === 'cancelled';

  // Calculate delivery estimation
  let estimation = null;
  const now = new Date();
  futureDates.forEach(date => {
    if (date.key.toLowerCase().includes('deliver') || date.key.toLowerCase().includes('expect') || date.key.toLowerCase().includes('arrive')) {
      const diffTime = date.value.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        estimation = `Arriving in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
      }
    }
  });

  // Sort timestamps for timeline (oldest first)
  timestamps.sort((a, b) => a.value - b.value);

  // Derive meaningful title based on prioritized signals (Using unified logic)
  const productTitle = getProductSummary(order);
  const title = productTitle === "Product not available" && id ? `Order #${id}` : productTitle;

  // Derive one key numeric value
  let keyNumeric = null;
  const currencyKeys = Object.keys(numerics).filter(k => k.toLowerCase().match(/(price|amount|total|cost|value)/));
  if (currencyKeys.length > 0) {
     keyNumeric = `$${Number(numerics[currencyKeys[0]]).toFixed(2)}`;
  } else if (Object.keys(numerics).length > 0) {
     const firstKey = Object.keys(numerics)[0];
     keyNumeric = `${formatLabel(firstKey)}: ${numerics[firstKey]}`;
  }

  return { id, status, inferred, isCompleted, timestamps, estimation, numerics, textFields, title, keyNumeric };
};

const formatLabel = (key) => {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

const formatDate = (date) => {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const StatusBadge = ({ status }) => {
  const lStatus = String(status).toLowerCase();
  let bg = 'bg-surface-200';
  let text = 'text-brand-700';

  if (lStatus.includes('deliver') || lStatus.includes('completed')) { bg = 'bg-green-100'; text = 'text-green-800'; }
  else if (lStatus.includes('transit') || lStatus.includes('ship')) { bg = 'bg-blue-100'; text = 'text-blue-800'; }
  else if (lStatus.includes('accept')) { bg = 'bg-accent-100'; text = 'text-accent-800'; }
  else if (lStatus.includes('pend') || lStatus.includes('review')) { bg = 'bg-yellow-100'; text = 'text-yellow-800'; }
  else if (lStatus.includes('reject') || lStatus.includes('cancel')) { bg = 'bg-red-100'; text = 'text-red-800'; }

  return (
    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${bg} ${text} uppercase tracking-wider whitespace-nowrap`}>
      {status}
    </span>
  );
};

/* --- LAYER 1: COMPACT ROW --- */
const OrderRow = ({ order, onClick }) => {
  const data = analyzeOrderData(order);
  
  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between px-5 py-3.5 bg-white border border-surface-200 hover:border-accent-300 hover:shadow-md cursor-pointer transition-all duration-200 rounded-lg group mb-2.5 min-h-[64px] max-h-[80px]"
    >
      <div className="flex items-center gap-6 flex-1 overflow-hidden">
        {/* Identifier / Title */}
        <div className="flex flex-col flex-1 min-w-0 justify-center">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand-900 truncate text-sm leading-tight">{data.title}</span>
            {data.title !== `Order #${data.id}` && (
               <span className="text-[10px] font-mono text-brand-500 bg-surface-100 px-1.5 py-0.5 rounded border border-surface-200 hidden sm:inline-block">#{data.id}</span>
            )}
            {data.inferred && <span className="text-[9px] text-brand-400 font-medium uppercase tracking-widest hidden lg:inline-block ml-1">Inferred</span>}
          </div>
          {data.estimation ? (
            <span className="text-[11px] font-medium text-accent-600 truncate mt-1 flex items-center gap-1.5">
               <Calendar size={12} className="text-accent-500"/> {data.estimation}
            </span>
          ) : (
            <span className="text-[11px] text-brand-400 truncate mt-1">
              Ref ID: {data.id}
            </span>
          )}
        </div>

        {/* Numeric primary */}
        {data.keyNumeric && (
          <div className="hidden md:flex flex-col items-end px-4 min-w-[120px] justify-center">
            <span className="text-sm font-semibold text-brand-900">{data.keyNumeric}</span>
          </div>
        )}

        {/* Status */}
        <div className="px-2 hidden sm:flex items-center justify-center min-w-[100px]">
           <StatusBadge status={data.status} />
        </div>
      </div>

      <div className="pl-4 flex items-center text-brand-300 group-hover:text-accent-500 transition-colors border-l border-surface-100 h-full">
         <ChevronRight size={18} />
      </div>
    </div>
  );
};

/* --- LAYER 2: EXPANDED DRAWER --- */
const SideDrawer = ({ order, onClose }) => {
  // Prevent any body scroll when active
  useEffect(() => {
    if (order) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [order]);

  if (!order) return null;
  const data = analyzeOrderData(order);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-brand-900/40 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Drawer Panel */}
      <div className="relative w-full max-w-md lg:max-w-xl bg-white h-full shadow-2xl overflow-y-auto border-l border-surface-200 flex flex-col transform transition-transform duration-300 translate-x-0 animate-slide-in-right">
         {/* Sticky header */}
         <div className="flex items-center justify-between p-6 border-b border-surface-100 sticky top-0 bg-white/95 backdrop-blur z-10">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg text-brand-900">{data.title}</h3>
                {data.title !== `Order #${data.id}` && (
                  <span className="text-xs font-mono text-brand-600 bg-surface-100 px-2 py-1 rounded-md border border-surface-200">#{data.id}</span>
                )}
              </div>
              {data.estimation && (
                <p className="text-xs font-medium text-accent-600 mt-1 flex items-center gap-1.5">
                  <Calendar size={12} className="text-accent-500"/> {data.estimation}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-surface-100 text-brand-400 hover:text-brand-700 transition-colors">
               <X size={20} />
            </button>
         </div>
         
         {/* Content */}
         <div className="p-6 space-y-8 flex-1">
            
            {/* Timeline */}
            <div className="space-y-5">
              <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest flex items-center justify-between pb-2 border-b border-surface-100">
                <span className="flex items-center gap-2"><Truck size={14} className="text-brand-300"/> Tracking History</span>
                <StatusBadge status={data.status} />
              </h4>
              
              {data.timestamps.length > 0 ? (
                <div className="space-y-0 text-sm">
                  {data.timestamps.map((t, idx) => (
                    <div key={idx} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 bg-accent-500 rounded-full mt-1.5 ring-4 ring-accent-50 group-hover:ring-accent-100 transition-colors" />
                        {idx < data.timestamps.length - 1 && <div className="w-0.5 h-10 bg-surface-100 my-1.5" />}
                      </div>
                      <div className="pb-4 text-sm">
                        <p className="font-medium text-brand-900 leading-none">{t.label}</p>
                        <p className="text-xs text-brand-400 mt-1.5">{formatDate(t.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-brand-400 italic rounded-md bg-surface-50 p-4 border border-surface-100 border-dashed">
                  No tracking events available.
                </div>
              )}
            </div>

            {/* Dynamic Data Details */}
            <div className="space-y-6">
              
              {/* Numbers */}
              {Object.keys(data.numerics).length > 0 && (
                 <div className="bg-surface-50 rounded-xl p-5 border border-surface-100">
                    <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <Box size={14} className="text-brand-300" /> Metrics & Values
                    </h4>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      {Object.entries(data.numerics).map(([k, v]) => {
                        const isCurrency = k.toLowerCase().match(/(price|amount|total|cost|value)/);
                        return (
                          <div key={k}>
                            <span className="block text-brand-400 text-[11px] uppercase mb-0.5 font-medium">{formatLabel(k)}</span>
                            <span className={`font-semibold ${isCurrency ? 'text-accent-700' : 'text-brand-900'}`}>
                              {isCurrency ? `$${Number(v).toFixed(2)}` : v}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                 </div>
              )}

              {/* Textual fields */}
              {Object.keys(data.textFields).length > 0 && (
                 <div>
                    <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest flex items-center gap-2 mb-3 px-1">
                      <Info size={14} className="text-brand-300" /> Details
                    </h4>
                    <div className="space-y-1 px-1">
                      {Object.entries(data.textFields).map(([k, v]) => {
                        if (v === data.title || v === 'Not available' || !v) return null;
                        return (
                          <div key={k} className="flex justify-between items-start gap-4 py-2.5 border-b border-surface-50 last:border-0 hover:bg-surface-50 -mx-2 px-2 rounded transition-colors">
                            <span className="text-brand-500 whitespace-nowrap text-xs mt-0.5">{formatLabel(k)}</span>
                            <span className="font-medium text-right break-words text-sm text-brand-900">
                              {v}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                 </div>
              )}
            </div>
         </div>
      </div>
    </div>
  );
};


/* --- MAIN SMART TRACKING COMPONENT --- */
const OrderTracking = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Scalability / UX additions
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('active'); // 'all', 'active', 'completed'
  const [selectedOrder, setSelectedOrder] = useState(null); // holds the order object or null

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await orderService.listOrders();
        const all = response?.data || [];
        setOrders(all);
      } catch (err) {
        setToast({ message: err.message || 'Failed to load orders', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    loadOrders();
  }, [user.email]);

  // Derived filtered data
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const data = analyzeOrderData(o);
      
      // Filter by type
      if (filterType === 'active' && data.isCompleted) return false;
      if (filterType === 'completed' && !data.isCompleted) return false;

      // Search by query (ID or title)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const strId = String(data.id).toLowerCase();
        const strTitle = data.title.toLowerCase();
        if (!strId.includes(query) && !strTitle.includes(query)) {
           return false;
        }
      }
      return true;
    });
  }, [orders, searchQuery, filterType]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-end border-b border-surface-200 pb-5">
          <div className="h-8 bg-surface-200 rounded w-1/4 mb-2"></div>
        </div>
        <div className="flex gap-4">
           <div className="h-10 bg-surface-100 rounded w-1/3"></div>
           <div className="h-10 bg-surface-100 rounded w-1/4"></div>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-[72px] bg-surface-100 rounded-lg border border-surface-200"></div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-surface-200 pb-5 gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-brand-900 tracking-tight flex items-center gap-3">
             Order Tracking
             {orders.length > 0 && (
                <span className="text-sm font-medium text-brand-500 bg-surface-100 px-2 py-0.5 rounded-full mt-1 border border-surface-200">
                  {orders.length} total
                </span>
             )}
          </h1>
          <p className="text-sm text-brand-500 mt-2">
            Scalable tracking view working with dynamic data schemas.
          </p>
        </div>

        {/* Filters & Search */}
        {orders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
             <div className="relative w-full sm:w-64">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
               <input 
                 type="text" 
                 placeholder="Search ID or Title..." 
                 className="input input-sm w-full pl-9 bg-white border-surface-200 focus:border-accent-500 focus:ring-accent-500 shadow-sm rounded-lg"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
             
             <div className="flex bg-surface-100 p-1 rounded-lg border border-surface-200 w-full sm:w-auto">
                <button 
                  onClick={() => setFilterType('active')} 
                  className={`text-xs font-semibold px-3 py-1.5 flex-1 sm:flex-none rounded-md transition-all ${filterType === 'active' ? 'bg-white shadow-sm text-brand-900' : 'text-brand-500 hover:text-brand-800'}`}
                >
                  Active
                </button>
                <button 
                  onClick={() => setFilterType('completed')} 
                  className={`text-xs font-semibold px-3 py-1.5 flex-1 sm:flex-none rounded-md transition-all ${filterType === 'completed' ? 'bg-white shadow-sm text-brand-900' : 'text-brand-500 hover:text-brand-800'}`}
                >
                  Completed
                </button>
                <button 
                  onClick={() => setFilterType('all')} 
                  className={`text-xs font-semibold px-3 py-1.5 flex-1 sm:flex-none rounded-md transition-all ${filterType === 'all' ? 'bg-white shadow-sm text-brand-900' : 'text-brand-500 hover:text-brand-800'}`}
                >
                  All
                </button>
             </div>
          </div>
        )}
      </div>

      <div className="bg-surface-50/50 p-2 rounded-xl border border-surface-100">
        {filteredOrders.length > 0 ? (
          <div className="flex flex-col">
            {filteredOrders.map((o, idx) => (
              <OrderRow key={o.id || o.order_id || idx} order={o} onClick={() => setSelectedOrder(o)} />
            ))}
          </div>
        ) : (
          <div className="card p-16 text-center bg-white border border-surface-200 rounded-xl shadow-sm flex flex-col items-center my-4 mx-2">
            <div className="w-20 h-20 bg-surface-50 rounded-full flex items-center justify-center mb-5 border border-surface-100 shadow-inner">
              <Package size={36} className="text-brand-300" />
            </div>
            <h3 className="text-xl font-bold text-brand-900 mb-2">No results found</h3>
            <p className="text-brand-500 max-w-sm">No orders match your current search and filter settings. Try adjusting them.</p>
            {(searchQuery || filterType !== 'all') && (
              <button 
                onClick={() => { setSearchQuery(''); setFilterType('all'); }}
                className="mt-6 text-sm font-semibold text-accent-600 hover:text-accent-700 bg-accent-50 px-4 py-2 rounded-lg transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Layer 2: Expanded Side Drawer overlay fixed */}
      <SideDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </>
  );
};

// Required CSS for animate-slide-in-right if not existing in tailwind config yet:
// This can be natively handled by style definitions, but typical tailwind projects support translate-x.
// The transition classes applied above (translate-x-0) rely on standard tailwind behaviors.

export default OrderTracking;
