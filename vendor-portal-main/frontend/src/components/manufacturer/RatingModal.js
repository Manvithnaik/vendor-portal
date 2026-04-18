import React, { useState, useEffect } from 'react';
import { ratingService } from '../../services/ratingService';
import { orderService } from '../../services/orderService';
import StarRating from '../common/StarRating';
import { X, Send, ShoppingBag, AlertCircle } from 'lucide-react';

const RatingModal = ({ isOpen, onClose, onSuccess, orderId }) => {
  const [unratedOrders, setUnratedOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(orderId || '');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (orderId) {
        setSelectedOrderId(orderId.toString());
      }
      loadUnratedOrders();
    }
  }, [isOpen, orderId]);

  const loadUnratedOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [orderRes, ratingRes] = await Promise.all([
        orderService.listOrders(),
        ratingService.getManufacturerRatings()
      ]);
      
      const shipped = (orderRes?.data || []).filter(o => 
        ['shipped', 'delivered'].includes(o.status)
      );
      
      const ratedIds = (ratingRes || []).map(r => r.order_id);
      const unrated = shipped.filter(o => !ratedIds.includes(o.id));
      
      setUnratedOrders(unrated);
      if (unrated.length > 0) {
        setSelectedOrderId(unrated[0].id.toString());
      }
    } catch (err) {
      setError('Failed to load orders for rating.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderId || rating === 0) {
      setError('Please select an order and a rating.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await ratingService.createRating({
        order_id: parseInt(selectedOrderId),
        rating: rating,
        comment: comment
      });
      onSuccess && onSuccess();
      onClose();
      // Reset form
      setRating(0);
      setComment('');
    } catch (err) {
      setError(err.message || 'Failed to submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-surface-200">
        <div className="flex items-center justify-between p-4 border-b border-surface-100 bg-surface-50">
          <h3 className="font-display font-bold text-brand-900 flex items-center gap-2">
            <ShoppingBag size={18} className="text-accent-500" />
            Rate This Order
          </h3>
          <button onClick={onClose} className="text-brand-400 hover:text-brand-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-8 text-center text-brand-400 animate-pulse">Loading orders...</div>
          ) : unratedOrders.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 bg-surface-100 rounded-full flex items-center justify-center mx-auto text-brand-300">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-medium text-brand-600">No unrated shipped orders found.</p>
              <button 
                onClick={onClose}
                className="btn-secondary w-full"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-400 mb-1.5 ml-1">
                  Select Order
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="input-field py-2"
                >
                  {unratedOrders.map(o => (
                    <option key={o.id} value={o.id}>
                      Order #{o.order_number || o.id} - {o.productName || 'Items'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col items-center py-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-400 mb-3 ml-1 w-full">
                  Overall Experience
                </label>
                <StarRating rating={rating} setRating={setRating} />
                <p className="text-xs text-brand-400 mt-2 font-medium">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-400 mb-1.5 ml-1">
                  Written Feedback
                </label>
                <textarea
                  className="input-field min-h-[100px] resize-none text-sm"
                  placeholder="Tell us about the product quality and service..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting || rating === 0}
                  className="btn-accent w-full flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Send size={16} /> Submit Rating</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost w-full"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
