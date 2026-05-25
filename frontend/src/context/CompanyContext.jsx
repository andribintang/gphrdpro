import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const CompanyContext = createContext({});

export const useCompany = () => useContext(CompanyContext);

export function CompanyProvider({ children }) {
  const [settings, setSettings] = useState({
    company_name:    'GPDISTRO HR Pro',
    company_tagline: 'Human Resource Management System',
    app_name:        'GPDISTRO HR Pro',
    logo_url:        '/logo-gpdistro.png',
    primary_color:   '#e11d48',
    sidebar_color:   'default',
    topbar_color:    'default',
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/company/settings');
      const s   = res.data.data.settings;
      setSettings(s);

      // Apply dynamic brand color via CSS variable
      if (s.primary_color) {
        applyBrandColor(s.primary_color);
      }
      if (s.sidebar_color) applySidebarColor(s.sidebar_color, s.primary_color);
      if (s.topbar_color)  applyTopbarColor(s.topbar_color,  s.primary_color);

      // Update page title
      if (s.app_name) {
        document.title = s.app_name;
      }
    } catch {
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <CompanyContext.Provider value={{ settings, loading, refresh: fetchSettings }}>
      {children}
    </CompanyContext.Provider>
  );
}


const applySidebarColor = (theme, brandHex) => {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const themes = {
    default: isDark ? { bg:'#1c1c1e', border:'#2c2c2e', hover:'#242428' }
                    : { bg:'#ffffff', border:'#f0f0f0', hover:'#f4f4f5' },
    brand:  { bg: brandHex||'#e11d48', border:'rgba(255,255,255,0.15)', hover:'rgba(255,255,255,0.12)' },
    dark:   { bg:'#18181b', border:'#27272a', hover:'#27272a' },
    slate:  { bg:'#1e293b', border:'#334155', hover:'#334155' },
    navy:   { bg:'#0f172a', border:'#1e3a5f', hover:'#1e3a5f' },
  };
  const t = themes[theme] || themes.default;
  root.style.setProperty('--sidebar-bg', t.bg);
  root.style.setProperty('--sidebar-border', t.border);
  root.style.setProperty('--sidebar-item-hover', t.hover);
  const isDarkTheme = ['brand','dark','slate','navy'].includes(theme);
  if (isDarkTheme) {
    root.style.setProperty('--sidebar-item-active-bg', 'rgba(255,255,255,0.18)');
    root.style.setProperty('--sidebar-item-active-text', '#ffffff');
    root.style.setProperty('--sidebar-text-override', '#ffffff');
  } else {
    root.style.removeProperty('--sidebar-item-active-bg');
    root.style.removeProperty('--sidebar-item-active-text');
    root.style.removeProperty('--sidebar-text-override');
  }
};

const applyTopbarColor = (theme, brandHex) => {
  const root = document.documentElement;
  const themes = {
    default: { bg:'#ffffff', border:'#f0f0f0' },
    brand:   { bg: brandHex||'#e11d48', border:'transparent' },
    dark:    { bg:'#18181b', border:'#27272a' },
    slate:   { bg:'#1e293b', border:'#334155' },
    glass:   { bg:'rgba(255,255,255,0.85)', border:'rgba(0,0,0,0.06)' },
  };
  const t = themes[theme] || themes.default;
  root.style.setProperty('--topbar-bg', t.bg);
  root.style.setProperty('--topbar-border', t.border);
  const isDarkTheme = ['brand','dark','slate'].includes(theme);
  if (isDarkTheme) root.style.setProperty('--topbar-text-override', '#ffffff');
  else root.style.removeProperty('--topbar-text-override');
};

// Apply brand color shades to CSS variables dynamically
const applyBrandColor = (hex) => {
  const root = document.documentElement;

  // Generate shades from hex
  const shades = generateShades(hex);

  Object.entries(shades).forEach(([shade, color]) => {
    root.style.setProperty(`--brand-${shade}`, color);
  });

  // Also update glow shadow
  root.style.setProperty('--brand-glow', `${hex}26`);
};

// Simple shade generator from a base hex color
const generateShades = (hex) => {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);

  const blend = (amount) => {
    const nr = Math.round(r + (255 - r) * amount);
    const ng = Math.round(g + (255 - g) * amount);
    const nb = Math.round(b + (255 - b) * amount);
    return `rgb(${nr},${ng},${nb})`;
  };

  const darken = (amount) => {
    const nr = Math.round(r * (1 - amount));
    const ng = Math.round(g * (1 - amount));
    const nb = Math.round(b * (1 - amount));
    return `rgb(${nr},${ng},${nb})`;
  };

  return {
    50:  blend(0.95),
    100: blend(0.88),
    200: blend(0.75),
    300: blend(0.55),
    400: blend(0.25),
    500: hex,
    600: darken(0.12),
    700: darken(0.25),
    800: darken(0.38),
    900: darken(0.48),
    950: darken(0.68),
  };
};
