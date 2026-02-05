// src/components/ThemeToggle.tsx
import { useTheme } from '../contexts/ThemeContext';

// Material Design icons from react-icons/md
import { MdLightMode, MdDarkMode, MdSettingsBrightness } from 'react-icons/md';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        borderRadius: '999px',
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      <button
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        title="Light mode"
        style={{
          background: theme === 'light' ? 'rgba(255,255,255,0.9)' : 'transparent',
          border: 'none',
          borderRadius: '50%',
          padding: '8px',
          cursor: 'pointer',
          color: theme === 'light' ? '#1e3a8a' : '#64748b',
          transition: 'all 0.2s ease',
        }}
      >
        <MdLightMode size={20} />
      </button>

      <button
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        title="Dark mode"
        style={{
          background: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'transparent',
          border: 'none',
          borderRadius: '50%',
          padding: '8px',
          cursor: 'pointer',
          color: theme === 'dark' ? '#e2e8f0' : '#64748b',
          transition: 'all 0.2s ease',
        }}
      >
        <MdDarkMode size={20} />
      </button>

      <button
        onClick={() => setTheme('system')}
        aria-pressed={theme === 'system'}
        title="System / Auto"
        style={{
          background: theme === 'system' ? 'rgba(100, 116, 139, 0.25)' : 'transparent',
          border: 'none',
          borderRadius: '50%',
          padding: '8px',
          cursor: 'pointer',
          color: theme === 'system' ? '#1e293b' : '#64748b',
          transition: 'all 0.2s ease',
        }}
      >
        <MdSettingsBrightness size={20} />
      </button>
    </div>
  );
}