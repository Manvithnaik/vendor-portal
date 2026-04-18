import React, { useState } from 'react';
import Modal from './Modal';
import { Star } from 'lucide-react';
import { vendorService } from '../../services/vendorService';

const RatingModal = ({ open, onClose, order, onRatingSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await vendorService.submitRating({
        order_id: order.id,
        rating,
        review
      });
      onRatingSuccess(order.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Rate Your Experience">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-brand-500 mb-4">
            How would you rate the service for Order <strong>#{order?.order_number}</strong>?
          </p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-transform active:scale-90"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
              >
                <Star
                  size={32}
                  className={`transition-colors ${
                    star <= (hover || rating)
                      ? 'fill-orange-400 text-orange-400'
                      : 'text-surface-300'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-xs font-bold text-orange-600 mt-2">
              {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating - 1]}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-brand-700 uppercase tracking-wider">
            Your Feedback (Optional)
          </label>
          <textarea
            className="input-field min-h-[100px] resize-none"
            placeholder="Tell us what you liked or how the vendor can improve..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 italic">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1 justify-center"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1 justify-center"
            disabled={submitting || rating === 0}
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RatingModal;
