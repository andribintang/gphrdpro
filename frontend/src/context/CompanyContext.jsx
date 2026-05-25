import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
const CompanyContext = createContext({});
export const useCompany = () => useContext(CompanyContext);
export function CompanyProvider({ children }) {
  const [settings, setSettings] = useState({
    company_name: 'GPDISTRO HR Pro', app_name: 'GPDISTRO HR Pro',
    logo_url: '/logo-gpdistro.png', primary_color: '#e11d48',
    sidebar_color: 'default', topbar_color: 'default',
  });
  const [loading, setLoading] = useState(true);
  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/company/settings');
      const s = res.data.data.settings;
      setSettings(s);
      if (s.primary_color) applyBrandColor(s.primary_color);
      if (s.sidebar_color) applySidebarColor(s.sidebar_color, s.primary_color);
      if (s.topbar_color) applyTopbarColor(s.topbar_color, s.primary_color);
      if (s.app_name) document.title = s.app_name;
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  return (<CompanyContext.Provider value={{ settings, loading, refresh: fetchSettings }}>{children}</CompanyContext.Provider>);
}
const applySidebarColor = (theme, brandHex) => {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const themes = { default: isDark ? {bg:'#1c1c1e',border:'#2c2c2e',hover:'#242428'} : {bg:'#ffffff',border:'#f0f0f0',hover:'#f4f4f5'}, brand:{bg:brandHex||'#e11d48',border:'rgba(255,255,255,0.15)',hover:'rgba(255,255,255,0.12)'}, dark:{bg:'#18181b',border:'#27272a',hover:'#27272a'}, slate:{bg:'#1e293b',border:'#334155',hover:'#334155'}, navy:{bg:'#0f172a',border:'#1e3a5f',hover:'#1e3a5f'} };
  const t = themes[theme] || themes.default;
  root.style.setProperty('--sidebar-bg', t.bg);
  root.style.setProperty('--sidebar-border', t.border);
  root.style.setProperty('--sidebar-item-hover', t.hover);
  if (['brand','dark','slate','navy'].includes(theme)) { root.style.setProperty('--sidebar-item-active-bg','rgba(255,255,255,0.18)'); root.style.setProperty('--sidebar-item-active-text','#ffffff'); root.style.setProperty('--sidebar-text-override','#ffffff'); }
  else { root.style.removeProperty('--sidebar-item-active-bg'); root.style.removeProperty('--sidebar-item-active-text'); root.style.removeProperty('--sidebar-text-override'); }
};
const applyTopbarColor = (theme, brandHex) => {
  const root = document.documentElement;
  const themes = { default:{bg:'#ffffff',border:'#f0f0f0'}, brand:{bg:brandHex||'#e11d48',border:'transparent'}, dark:{bg:'#18181b',border:'#27272a'}, slate:{bg:'#1e293b',border:'#334155'}, glass:{bg:'rgba(255,255,255,0.85)',border:'rgba(0,0,0,0.06)'} };
  const t = themes[theme] || themes.default;
  root.style.setProperty('--topbar-bg', t.bg);
  root.style.setProperty('--topbar-border', t.border);
  if (['brand','dark','slate'].includes(theme)) root.style.setProperty('--topbar-text-override','#ffffff');
  else root.style.removeProperty('--topbar-text-override');
};
const applyBrandColor = (hex) => {
  const root = document.documentElement;
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  const blend=(a)=>String.fromCodePoint(...[]).length===0&&`rgb(${Math.round(r+(255-r)*a)},${Math.round(g+(255-g)*a)},${Math.round(b+(255-b)*a)})`;
  const darken=(a)=>`rgb(${Math.round(r*(1-a))},${Math.round(g*(1-a))},${Math.round(b*(1-a))})`;
  const bl=(a)=>`rgb(${Math.round(r+(255-r)*a)},${Math.round(g+(255-g)*a)},${Math.round(b+(255-b)*a)})`;
  [50,100,200,300,400,500,600,700,800,900,950].forEach(s => root.style.setProperty(`--brand-${s}`, s<=400?bl([0.95,0.88,0.75,0.55,0.25][Math.floor(s/100-0.5)]):s===500?hex:darken([0.12,0.25,0.38,0.48,0.68][s/100-6])));
  root.style.setProperty('--brand-glow',`${hex}26`);
};
