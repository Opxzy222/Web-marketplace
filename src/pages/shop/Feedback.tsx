// components/FeedbackScreen.tsx
import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Star, 
  StarOff, 
  Send 
} from 'lucide-react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import '../../css/shop/FeedBack.css';
import PageShell from '../../components/PageShell';

const supabaseUrl = 'https://gpkffwjenljkiyjnuldl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwa2Zmd2plbmxqa2l5am51bGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzkzNDEsImV4cCI6MjA3NTc1NTM0MX0.elswjg5HN_Y3Lv2vyTskcQJhmg5KM3uGfgtVkea-MQk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const Feedback: React.FC = () => {
  const navigate = useNavigate();

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const btnScale = useMotionValue(1);
  const scaleSpring = useSpring(btnScale, { stiffness: 300, damping: 20 });

  const handleStar = (star: number) => {
    if (!submitting) setRating(star);
  };

  const handleSubmit = async () => {
    if (rating === 0 && !feedback.trim()) {
      alert('Please give a rating or write some feedback.');
      return;
    }

    setSubmitting(true);

    try {
      const userId = localStorage.getItem('userId') || 'anonymous';

      const { error } = await supabase
        .from('feedback')
        .insert([{ user_id: userId, rating, comment: feedback.trim() || null }]);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate('/profile');
      }, 2200);
    } catch (err) {
      console.error('Feedback error:', err);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Give Feedback"
      showBackButton={true}
      isLoading={false}
    >
      <div className="feedback-wrapper">
        <div className="feedback-card">
          <h2 className="form-title">How was your experience?</h2>
          <p className="form-subtitle">
            Your feedback helps us build a better app for everyone.
          </p>

          {/* Stars */}
          <div className="stars-row">
            {Array.from({ length: 5 }, (_, i) => {
              const filled = i < rating;
              return (
                <motion.button
                  key={i}
                  className="star-btn"
                  onClick={() => handleStar(i + 1)}
                  disabled={submitting}
                  whileHover={!submitting ? { scale: 1.25, rotate: 10 } : {}}
                  whileTap={!submitting ? { scale: 0.9 } : {}}
                >
                  {filled ? (
                    <Star size={42} fill="#FFD700" stroke="#FFD700" />
                  ) : (
                    <StarOff size={42} stroke="#9CA3AF" />
                  )}
                </motion.button>
              );
            })}
          </div>

          <p className="rating-display">Rating: {rating} / 5</p>

          {/* Textarea */}
          <div className="textarea-group">
            <label className="textarea-label">Tell us more (optional)</label>
            <textarea
              className="feedback-textarea"
              placeholder="What do you love? What can we improve?"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={5}
              disabled={submitting}
            />
          </div>

          {/* Submit Button */}
          <motion.button
            className={`submit-btn ${submitting ? 'loading' : ''}`}
            disabled={submitting}
            onClick={handleSubmit}
            style={{ scale: scaleSpring }}
            whileHover={!submitting ? { scale: 1.04 } : {}}
            whileTap={!submitting ? { scale: 0.96 } : {}}
            onMouseDown={() => btnScale.set(0.94)}
            onMouseUp={() => btnScale.set(1)}
          >
            {submitting ? (
              <>
                <Loader2 className="spinner" size={22} />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={22} />
                <span>Submit Feedback</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Success Toast */}
        <AnimatePresence>
          {success && (
            <motion.div
              className="success-toast"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
            >
              <CheckCircle2 size={24} />
              <span>Thank you! Feedback received.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
};

export default Feedback;