// src/components/ThemeToggle.tsx
import { useTheme } from '../contexts/ThemeContext';
import { MdLightMode, MdDarkMode, MdSettingsBrightness } from 'react-icons/md';
import '../css/component/ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const isLight = theme === 'light';
  const isDark = theme === 'dark';
  const isSystem = theme === 'system';

  return (
    <div className="theme-toggle-container">
      <button
        className={`theme-btn ${isLight ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        aria-pressed={isLight}
        title="Light mode"
      >
        <MdLightMode size={20} />
      </button>

      <button
        className={`theme-btn ${isDark ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        aria-pressed={isDark}
        title="Dark mode"
      >
        <MdDarkMode size={20} />
      </button>

      {/*<button
        className={`theme-btn ${isSystem ? 'active' : ''}`}
        onClick={() => setTheme('system')}
        aria-pressed={isSystem}
        title="Follow system"
      >
        <MdSettingsBrightness size={20} />
      </button> */}
    </div>
  );
}