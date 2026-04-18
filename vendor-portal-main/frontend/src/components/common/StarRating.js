import React, { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ rating, setRating, readOnly = false }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={`${readOnly ? "cursor-default" : "cursor-pointer"} transition-colors`}
          onClick={() => !readOnly && setRating(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
        >
          <Star
            size={24}
            fill={(hover || rating) >= star ? "currentColor" : "none"}
            className={(hover || rating) >= star ? "text-yellow-400" : "text-surface-300"}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
