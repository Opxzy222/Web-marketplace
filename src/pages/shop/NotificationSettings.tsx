// components/NotificationSettings.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Bell, UserCheck, FileText, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import '../../css/shop/NotificationSettings.css';
import PageShell from '../../components/PageShell';

interface NotificationPreferences {
  shop_follower: boolean;
  shop_review: boolean;
  shop_post: boolean;
  receipt_created: boolean;
  receipt_status: boolean;
}

const NotificationSettings: React.FC = () => {
  const navigate = useNavigate();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    shop_follower: true,
    shop_review: true,
    shop_post: true,
    receipt_created: true,
    receipt_status: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('sessionToken');
        if (!token) return;

        const res = await axios.get(
          'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/api/notification-preferences/',
          { headers: { Authorization: token } }
        );

        setPreferences(res.data || preferences);
      } catch (err) {
        console.error('Failed to load notification preferences', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const toggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('sessionToken');
      if (!token) return;

      await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/api/notification-preferences/',
        preferences,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
        }
      );

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2200);
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const items = [
    { key: 'shop_follower' as const, label: 'New Space Follower', icon: Bell },
    { key: 'shop_review' as const, label: 'New Space Review', icon: UserCheck },
    { key: 'shop_post' as const, label: 'New Space Post', icon: Bell },
    { key: 'receipt_created' as const, label: 'New Receipt Created', icon: FileText },
    { key: 'receipt_status' as const, label: 'Receipt Status Update', icon: Receipt },
  ];

  return (
    <PageShell
      title="Notification Settings"
      showBackButton={true}
      isLoading={loading}
    >
      <div className="notification-settings-wrapper">
        <div className="settings-list">
          {items.map(({ key, label, icon: Icon }) => (
            <motion.div
              key={key}
              className="setting-row"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * items.findIndex(i => i.key === key) }}
            >
              <div className="setting-left">
                <div className="setting-icon-wrapper">
                  <Icon size={22} />
                </div>
                <span className="setting-label">{label}</span>
              </div>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={() => toggle(key)}
                  disabled={saving}
                />
                <span className="slider round" />
              </label>
            </motion.div>
          ))}
        </div>

        <motion.button
          className={`save-btn ${saving ? 'loading' : ''}`}
          onClick={save}
          disabled={saving}
          whileHover={!saving ? { scale: 1.03, y: -2 } : {}}
          whileTap={!saving ? { scale: 0.97 } : {}}
        >
          {saving ? (
            <>
              <Loader2 className="spinner" size={20} />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={20} />
              <span>Save Changes</span>
            </>
          )}
        </motion.button>

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              className="success-toast"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.4 }}
            >
              <CheckCircle2 size={20} />
              <span>Preferences updated successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
};

export default NotificationSettings;