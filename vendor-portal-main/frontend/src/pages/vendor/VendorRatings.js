import React, { useState, useEffect } from 'react';
import { ratingService } from '../../services/ratingService';
import StarRating from '../../components/common/StarRating';
import Toast from '../../components/common/Toast';
import { Star, MessageSquare, User, TrendingUp } from 'lucide-react';

const VendorRatings = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const loadRatings = async () => {
      try {
        setLoading(true);
        const data = await ratingService.getVendorRatings();
        setRatings(data || []);
      } catch (err) {
        setToast({ message: 'Failed to load ratings', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    loadRatings();
  }, []);

  const averageRating = ratings.length > 0
    ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1)
    : 0;

  if (loading) return <div className="p-8 text-center text-brand-400">Loading reviews...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-900">Performance & Reviews</h1>
          <p className="text-sm text-brand-400 mt-1">Monitor your service quality based on manufacturer feedback.</p>
        </div>
        
        {ratings.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4">
            <div className="bg-yellow-50 p-2 rounded-xl text-yellow-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs text-brand-400 font-medium uppercase tracking-wider">Average Rating</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-display font-bold text-brand-900">{averageRating}</span>
                <Star size={18} fill="currentColor" className="text-yellow-400" />
                <span className="text-sm text-brand-400">({ratings.length} reviews)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {ratings.length === 0 ? (
          <div className="card p-12 text-center bg-surface-50">
            <MessageSquare size={48} className="text-brand-100 mx-auto mb-4" />
            <p className="text-brand-500 font-medium">No reviews yet.</p>
            <p className="text-sm text-brand-400 mt-1">Feedback from manufacturers will appear here after shipping.</p>
          </div>
        ) : (
          ratings.map(review => (
            <div key={review.id} className="card p-6 border border-surface-200">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} readOnly />
                    <span className="text-sm font-bold text-brand-800 ml-2">{review.rating}.0</span>
                  </div>
                  
                  <div className="bg-surface-50 p-4 rounded-xl relative">
                    <span className="absolute -top-2 left-4 px-2 bg-brand-800 text-[10px] text-white rounded font-bold uppercase tracking-widest">Feedback</span>
                    <p className="text-brand-700 leading-relaxed italic">"{review.comment}"</p>
                  </div>
                </div>

                <div className="md:w-64 flex flex-col items-end gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-brand-400 uppercase font-bold tracking-widest">Order Details</p>
                    <p className="text-sm font-bold text-brand-900">#{review.order_number}</p>
                  </div>
                  <div className="flex items-center gap-2 text-right bg-surface-100 py-1 px-3 rounded-lg">
                    <div className="text-right">
                      <p className="text-[10px] text-brand-400 uppercase font-bold tracking-widest">Manufacturer</p>
                      <p className="text-xs font-bold text-brand-700">{review.customer_name}</p>
                    </div>
                    <User size={16} className="text-brand-400" />
                  </div>
                  <p className="text-[10px] text-brand-400 mt-1">
                    Submitted: {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VendorRatings;
