import React, { useState, useEffect } from 'react';
import { orderService } from '../../services/orderService';
import { ratingService } from '../../services/ratingService';
import StarRating from '../../components/common/StarRating';
import Toast from '../../components/common/Toast';
import { ShoppingBag, CheckCircle, MessageSquare } from 'lucide-react';

const OrderRatings = () => {
  const [orders, setOrders] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Local state for the rating form
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [orderRes, ratingRes] = await Promise.all([
        orderService.listOrders(),
        ratingService.getManufacturerRatings()
      ]);
      
      // Only show orders that are shipped or delivered
      const shippedOrders = (orderRes?.data || []).filter(o => 
        ['shipped', 'delivered'].includes(o.status)
      );
      
      setOrders(shippedOrders);
      setRatings(ratingRes || []);
    } catch (err) {
      setToast({ message: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeOrderId) return;
    
    setSubmitting(true);
    try {
      await ratingService.createRating({
        order_id: activeOrderId,
        rating: newRating,
        comment: newComment
      });
      setToast({ message: 'Rating submitted successfully!', type: 'success' });
      setActiveOrderId(null);
      setNewRating(5);
      setNewComment('');
      loadData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to submit rating', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-brand-400">Loading orders...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Rate & Review</h1>
        <p className="text-sm text-brand-400 mt-1">Provide feedback for your shipped orders.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {orders.length === 0 ? (
          <div className="card p-12 text-center">
            <ShoppingBag size={48} className="text-brand-100 mx-auto mb-4" />
            <p className="text-brand-500 font-medium">No orders ready for rating.</p>
            <p className="text-sm text-brand-400 mt-1">Orders can be rated only after they are shipped.</p>
          </div>
        ) : (
          orders.map(order => {
            const existingRating = ratings.find(r => r.order_id === order.id);
            const isRating = activeOrderId === order.id;

            return (
              <div key={order.id} className="card p-6 border-l-4 border-l-accent-500">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-accent-600 bg-accent-50 px-2 py-0.5 rounded">
                        Order #{order.order_number}
                      </span>
                      <span className="text-xs text-brand-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-brand-900 text-lg">{order.productName || 'Order Items'}</h3>
                    <p className="text-sm text-brand-500">Vendor: <span className="font-medium text-brand-800">{order.vendorName || order.vendorEmail}</span></p>
                  </div>

                  <div className="flex items-center gap-3">
                    {existingRating ? (
                      <div className="text-right">
                        <div className="flex justify-end mb-1">
                          <StarRating rating={existingRating.rating} readOnly />
                        </div>
                        <p className="text-xs text-brand-400 italic">" {existingRating.comment} "</p>
                        <div className="flex items-center justify-end gap-1 mt-2 text-success-600 font-medium text-xs">
                          <CheckCircle size={12} /> Rated
                        </div>
                      </div>
                    ) : isRating ? (
                      <button 
                        onClick={() => setActiveOrderId(null)}
                        className="text-sm text-brand-400 hover:text-brand-600 font-medium"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button 
                        onClick={() => setActiveOrderId(order.id)}
                        className="btn-accent py-2 px-6"
                      >
                        Rate Now
                      </button>
                    )}
                  </div>
                </div>

                {isRating && (
                  <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-surface-100 space-y-4">
                    <div className="bg-surface-50 p-4 rounded-xl space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-2">Overall Rating</label>
                        <StarRating rating={newRating} setRating={setNewRating} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-2">Your Review</label>
                        <textarea
                          required
                          className="input-field min-h-[100px] bg-white text-sm"
                          placeholder="Tell us about the product quality and service..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button 
                          type="submit" 
                          disabled={submitting}
                          className="btn-accent flex items-center gap-2"
                        >
                          {submitting ? 'Submitting...' : (
                            <><MessageSquare size={16} /> Submit Feedback</>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrderRatings;
