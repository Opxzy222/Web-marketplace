// ReviewForm.jsx
import React, { useState, useEffect } from 'react';
import { Star, Send, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import '../../css/component/shop/ReviewForm.css';

const ReviewForm = ({ shopId, onReviewSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isVerified, setIsVerified] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSessionAndVerification = async () => {
      try {
        const sessionIdString = localStorage.getItem('sessionToken');
        setSessionId(sessionIdString);

        const value = localStorage.getItem("user_verified");
        const userVerified = value ? JSON.parse(value) : null;
        setIsVerified(userVerified);
      } catch (error) {
        console.error('Error fetching session or verification status:', error);
      }
    };

    fetchSessionAndVerification();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRatingError('');

    if (isVerified === false) {
      alert('Verification Required\nOnly verified users can post a review. Please verify your ID to continue.');
      return;
    }

    if (isVerified === null) {
      alert('Error\nUnable to verify user status. Please try again.');
      return;
    }

    if (!comment.trim()) {
      setError('Comment cannot be empty.');
      return;
    }

    if (rating === 0) {
      setRatingError('Please select a rating.');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('shop', shopId);
    formData.append('rating', rating);
    formData.append('comment', comment);

    try {
      const response = await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/reviews/submit/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: sessionId,
          },
        }
      );
      onReviewSubmitted(response.data);
      setRating(0);
      setComment('');
      alert('Success!\nReview submitted successfully!');
    } catch (error) {
      alert('Error\nFailed to submit review.');
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="review-form-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <form onSubmit={handleSubmit} className="review-form">
        <div className="form-group">
          <label className="form-label">Comment</label>
          <textarea
            className={`text-input ${error ? 'error' : ''}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write your review here..."
            rows={4}
            maxLength={1000}
          />
          <AnimatePresence>
            {error && (
              <motion.div 
                className="error-message"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="form-group">
          <label className="form-label">Rating</label>
          <div className="star-rating-container">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                type="button"
                className={`star-button ${rating >= star ? 'filled' : ''}`}
                onClick={() => setRating(star)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.95 }}
                animate={{ 
                  rotate: rating >= star ? [0, 5, -5, 0] : 0 
                }}
              >
                <Star size={32} />
              </motion.button>
            ))}
          </div>
          <AnimatePresence>
            {ratingError && (
              <motion.div 
                className="error-message"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <AlertCircle size={16} />
                <span>{ratingError}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="submit"
          className="submit-button"
          disabled={isSubmitting || rating === 0 || !comment.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabledAnimation={{ scale: 1 }}
        >
          {isSubmitting ? (
            <>
              <div className="spinner" />
              Submitting...
            </>
          ) : (
            <>
              <Send size={20} />
              Submit Review
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default ReviewForm;
