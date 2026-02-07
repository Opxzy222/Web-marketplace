// ShopReview.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';  // ← changed RateReview → Star
import '../../css/component/shop/ShopReview.css';

const ShopReview = ({ reviews = [], count = 0 }) => {
  // Group reviews by reviewer (latest first)
  const groupedReviews = useMemo(() => {
    const byUser = reviews.reduce((acc, review) => {
      const name = review.reviewer__fullname || "Anonymous";
      if (!acc[name]) acc[name] = [];
      acc[name].push(review);
      return acc;
    }, {});

    return Object.entries(byUser)
      .map(([reviewer, userReviews]) => {
        const sorted = userReviews.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        return {
          reviewer,
          latestReview: sorted[0],
          olderReviews: sorted.slice(1),
        };
      })
      .sort((a, b) => new Date(b.latestReview.created_at) - new Date(a.latestReview.created_at));
  }, [reviews]);

  const [expanded, setExpanded] = useState({});

  const toggleExpand = (reviewer) => {
    setExpanded((prev) => ({ ...prev, [reviewer]: !prev[reviewer] }));
  };

  const StarRating = ({ rating, size = 18 }) => (
    <div className="star-rating-display">
      {Array.from({ length: 5 }, (_, i) => (
        <motion.div
          key={i}
          className={`star-display ${i < rating ? 'filled' : ''}`}
          style={{ fontSize: size }}
          whileHover={{ scale: 1.1 }}
        >
          ★
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="shop-review-container">
      {/* Review Count Badge */}
      {count > 0 && (
        <motion.div 
          className="count-badge"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Star size={16} />  {/* ← changed here */}
          <span>{count} {count === 1 ? "review" : "reviews"}</span>
        </motion.div>
      )}

      {/* Reviews List */}
      <AnimatePresence>
        {groupedReviews.length > 0 ? (
          groupedReviews.map(({ reviewer, latestReview, olderReviews }, index) => (
            <motion.div
              key={latestReview.id}
              className="review-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="review-header">
                <h3 className="reviewer-name">{reviewer}</h3>
                <StarRating rating={latestReview.rating} />
              </div>

              {latestReview.comment ? (
                <p className="comment">{latestReview.comment}</p>
              ) : (
                <p className="no-comment">No written review</p>
              )}

              <div className="review-date">
                {new Date(latestReview.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>

              {/* Expand older reviews */}
              {olderReviews.length > 0 && (
                <motion.button
                  className="expand-button"
                  onClick={() => toggleExpand(reviewer)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>
                    {expanded[reviewer]
                      ? "Hide"
                      : `+ ${olderReviews.length} more`}
                  </span>
                  {expanded[reviewer] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </motion.button>
              )}

              <AnimatePresence>
                {expanded[reviewer] && olderReviews.map((old, idx) => (
                  <motion.div
                    key={old.id}
                    className="older-review"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <p className="older-comment">{old.comment || "No comment"}</p>
                    <div className="older-date">
                      {new Date(old.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ))
        ) : (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Star size={48} className="empty-icon" />  {/* ← changed here too */}
            <h3 className="empty-text">No reviews yet</h3>
            <p className="empty-subtitle">Be the first to leave a review!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShopReview;