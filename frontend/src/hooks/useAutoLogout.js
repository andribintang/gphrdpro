import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 menit tidak aktif
const WARNING_MS =  5 * 60 * 1000; // warning 5 menit sebelum

export default function useAutoLogout(onLogout) {
  const navigate   = useNavigate();
  const timerRef   = useRef(null);
  const warnRef    = useRef(null);
  const warnedRef  = useRef(false);

  const doLogout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.clear();
    if (onLogout) onLogout();
    navigate('/login', { replace: true });
  }, [navigate, onLogout]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warnRef.current)  clearTimeout(warnRef.current);
    warnedRef.current = false;

    // Warning 5 menit sebelum timeout
    warnRef.current = setTimeout(() => {
      if (!warnedRef.current) {
        warnedRef.current = true;
        const stay = window.confirm(
          '⚠ Sesi Anda akan berakhir dalam 5 menit karena tidak ada aktivitas.\n\nKlik OK untuk tetap login.'
        );
        if (stay) resetTimer();
      }
    }, TIMEOUT_MS - WARNING_MS);

    // Auto logout setelah 30 menit
    timerRef.current = setTimeout(() => {
      doLogout();
      setTimeout(() => alert('Sesi berakhir karena tidak ada aktivitas selama 30 menit.'), 100);
    }, TIMEOUT_MS);
  }, [doLogout]);

  useEffect(() => {
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => resetTimer();
    events.forEach(e => document.addEventListener(e, handleActivity, { passive: true }));
    resetTimer();
    return () => {
      events.forEach(e => document.removeEventListener(e, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warnRef.current)  clearTimeout(warnRef.current);
    };
  }, [resetTimer]);
}
