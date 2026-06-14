import { useState, useEffect } from 'react';
import api from '../utils/api';

const DURATION = 3000; // 3 seconds

export default function SplashScreen({ onDone, companyName = 'GPDISTRO RACING ID' }) {
  const [quote,   setQuote]   = useState(null);
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Fetch today's quote
    api.get('/quotes/today')
      .then(r => setQuote(r.data.data?.quote))
      .catch(() => {});

    // Auto dismiss after DURATION
    const t1 = setTimeout(() => setFadeOut(true), DURATION - 400);
    const t2 = setTimeout(() => { setVisible(false); onDone?.(); }, DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div
      onClick={() => { setFadeOut(true); setTimeout(() => { setVisible(false); onDone?.(); }, 300); }}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between
        transition-opacity duration-400 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{
        background: 'linear-gradient(160deg, #be123c 0%, #9f1239 40%, #1e1b4b 100%)',
        paddingTop:  'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>

      {/* Top — Logo & Brand */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16">
        {/* Logo circle */}
        <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur border border-white/20
          flex items-center justify-center mb-5 shadow-2xl"
          style={{animation:'splash-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both'}}>
          <span className="text-4xl font-black text-white">GP</span>
        </div>

        <p className="text-white font-black text-xl tracking-wide text-center mb-1"
          style={{animation:'splash-fade-up 0.5s 0.15s ease both'}}>
          {companyName}
        </p>
        <p className="text-white/60 text-sm font-medium"
          style={{animation:'splash-fade-up 0.5s 0.25s ease both'}}>
          ERP & HRD Integrated System
        </p>
      </div>

      {/* Middle — Quote */}
      <div className="px-8 py-8 w-full max-w-sm mx-auto"
        style={{animation:'splash-fade-up 0.6s 0.4s ease both'}}>
        <div className="bg-white/10 backdrop-blur border border-white/15 rounded-3xl p-5">
          {/* Quote icon */}
          <div className="text-white/40 text-4xl font-serif leading-none mb-3 select-none">"</div>

          {quote ? (<>
            <p className="text-white font-semibold text-base leading-relaxed mb-3">
              {quote.content_id}
            </p>
            <p className="text-white/55 text-sm italic leading-relaxed border-t border-white/15 pt-3">
              {quote.content_en}
            </p>
          </>) : (
            <div className="space-y-2">
              <div className="h-4 bg-white/20 rounded-full animate-pulse"/>
              <div className="h-4 bg-white/20 rounded-full animate-pulse w-4/5"/>
              <div className="h-3 bg-white/10 rounded-full animate-pulse mt-3"/>
            </div>
          )}

          {/* Today's date */}
          <p className="text-white/40 text-[11px] font-medium mt-3 text-right">
            {new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>
      </div>

      {/* Bottom — tap to skip */}
      <div className="pb-10 text-center" style={{animation:'splash-fade-up 0.5s 0.6s ease both'}}>
        <p className="text-white/40 text-xs font-medium">Ketuk untuk melewati</p>
        {/* Loading dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30"
              style={{animation:`splash-dot 1.2s ${i*0.2}s ease-in-out infinite`}}/>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes splash-pop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes splash-fade-up {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes splash-dot {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
