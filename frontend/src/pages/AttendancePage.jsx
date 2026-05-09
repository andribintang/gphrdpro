import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock, Camera, MapPin, CheckCircle2, LogIn, LogOut,
  Coffee, Play, ChevronLeft, ChevronRight, RefreshCw,
  AlertTriangle, Loader2, Navigation, Shield, ShieldCheck,
  ShieldX, Map, Users, Eye, Settings, X, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLiveClock } from '../hooks/useLiveClock';
import {
  attendanceService, getGPSLocation,
  STATUS_CONFIG, formatTime, formatDate,
} from '../utils/attendanceService';

// @vladmandic/face-api — script & model dari package yang SAMA (konsisten)
const FACE_API_SCRIPT = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
const FACE_MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const FACE_MATCH_THRESHOLD = 0.55;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'hrd_attendance';
const CLOUDINARY_CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// ── Load face-api.js script ───────────────────────────────────
let faceApiLoaded = false;
let faceApiLoading = false;
const loadFaceApi = () => new Promise((resolve, reject) => {
  if (faceApiLoaded) { resolve(window.faceapi); return; }
  if (faceApiLoading) { const t = setInterval(() => { if (faceApiLoaded) { clearInterval(t); resolve(window.faceapi); } }, 200); return; }
  faceApiLoading = true;
  const script = document.createElement('script');
  script.src = FACE_API_SCRIPT;
  script.onload = async () => {
    try {
      const fa = window.faceapi;
      // Load models — script + weights versi sama (0.22.2) dari jsDelivr
      await Promise.all([
        fa.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_URL),
        fa.nets.faceLandmark68TinyNet.loadFromUri(FACE_MODELS_URL),
        fa.nets.faceRecognitionNet.loadFromUri(FACE_MODELS_URL),
      ]);
      faceApiLoaded = true;
      faceApiLoading = false;
      resolve(fa);
    } catch (err) { faceApiLoading = false; reject(err); }
  };
  script.onerror = () => { faceApiLoading = false; reject(new Error('Gagal load face-api.js')); };
  document.head.appendChild(script);
});

// ── Haversine distance ────────────────────────────────────────
const calcDist = (lat1, lng1, lat2, lng2) => {
  const R = 6371000, toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2-lat1), dLng = toRad(lng2-lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

// ── Canvas capture ────────────────────────────────────────────
const captureFrame = (video) => {
  const canvas = document.createElement('canvas');
  canvas.width = 400; canvas.height = 400;
  const ctx = canvas.getContext('2d');
  const vw = video.videoWidth, vh = video.videoHeight;
  const size = Math.min(vw, vh);
  const sx = (vw - size) / 2, sy = (vh - size) / 2;
  ctx.drawImage(video, sx, sy, size, size, 0, 0, 400, 400);
  return canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
};

// ── Status Badge ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.absent;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════
// CAMERA + FACE RECOGNITION MODAL
// ════════════════════════════════════════════════════════════════
function CameraModal({ mode, onCapture, onClose, registeredDescriptor }) {
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const detectorRef  = useRef(null);
  const canvasRef    = useRef(null);

  const [phase, setPhase]         = useState('loading'); // loading | ready | detecting | captured | error
  const [faceBox, setFaceBox]     = useState(null);
  const [faceScore, setFaceScore] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [loadMsg, setLoadMsg]     = useState('Memuat model AI...');
  const [capturedImg, setCapturedImg] = useState(null);

  const MODES = {
    'check-in':  { title: 'Selfie Check-In',  icon: LogIn,  color: 'text-emerald-500', hint: 'Posisikan wajah di tengah lingkaran' },
    'check-out': { title: 'Selfie Check-Out', icon: LogOut, color: 'text-blue-500',    hint: 'Posisikan wajah di tengah lingkaran' },
    'register':  { title: 'Daftarkan Wajah',  icon: Shield, color: 'text-purple-500',  hint: 'Pastikan wajah terlihat jelas & pencahayaan bagus' },
  };
  const cfg = MODES[mode] || MODES['check-in'];

  useEffect(() => {
    let detectInterval;
    const init = async () => {
      try {
        setLoadMsg('Memuat model AI...');
        const fa = await loadFaceApi();
        setLoadMsg('Mengakses kamera...');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPhase('ready');

        // Start face detection loop
        detectInterval = setInterval(async () => {
          if (!videoRef.current || phase === 'captured') return;
          try {
            const detection = await fa.detectSingleFace(
              videoRef.current,
              new fa.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
            ).withFaceLandmarks(true).withFaceDescriptor();

            if (detection) {
              setPhase('detecting');
              const { x, y, width, height } = detection.detection.box;
              const vw = videoRef.current.videoWidth, vh = videoRef.current.videoHeight;
              setFaceBox({ x: x/vw*100, y: y/vh*100, w: width/vw*100, h: height/vh*100 });

              // Compare with registered if available (for check-in/out)
              if (registeredDescriptor && mode !== 'register') {
                const distance = fa.euclideanDistance(detection.descriptor, new Float32Array(registeredDescriptor));
                const score = Math.max(0, 1 - distance);
                setFaceScore(score);

                if (score >= FACE_MATCH_THRESHOLD) {
                  // Auto capture with countdown
                  let count = 3;
                  setCountdown(count);
                  const cd = setInterval(() => {
                    count--;
                    if (count > 0) setCountdown(count);
                    else {
                      clearInterval(cd);
                      setCountdown(null);
                      doCapture(detection.descriptor, score);
                    }
                  }, 1000);
                }
              } else if (mode === 'register') {
                setFaceScore(detection.detection.score);
              }
            } else {
              setPhase('ready');
              setFaceBox(null);
              setFaceScore(null);
            }
          } catch { /* silent */ }
        }, 300);

      } catch (err) {
        setPhase('error');
        setLoadMsg(err.message || 'Gagal mengakses kamera');
      }
    };

    const doCapture = (descriptor, score) => {
      if (!videoRef.current) return;
      const base64 = captureFrame(videoRef.current);
      setCapturedImg(`data:image/jpeg;base64,${base64}`);
      setPhase('captured');
      clearInterval(detectInterval);
      onCapture({ base64, descriptor: descriptor ? Array.from(descriptor) : null, score });
    };

    init();

    return () => {
      clearInterval(detectInterval);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleManualCapture = async () => {
    if (!videoRef.current || phase === 'captured') return;
    try {
      const fa = await loadFaceApi();
      const detection = await fa.detectSingleFace(videoRef.current, new fa.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })).withFaceLandmarks(true).withFaceDescriptor();
      const base64 = captureFrame(videoRef.current);
      setCapturedImg(`data:image/jpeg;base64,${base64}`);
      setPhase('captured');
      onCapture({
        base64,
        descriptor: detection ? Array.from(detection.descriptor) : null,
        score: detection ? detection.detection.score : 0,
        manualCapture: true,
        unverified: !detection,
      });
    } catch { toast.error('Gagal capture foto'); }
  };

  const scoreColor = faceScore !== null
    ? faceScore >= FACE_MATCH_THRESHOLD ? 'text-emerald-500' : 'text-amber-500'
    : 'text-[var(--text-muted)]';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}>
      <div className="relative w-full sm:max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--border)] overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--border2)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
            <span className="font-bold text-[var(--text-primary)] text-sm">{cfg.title}</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black" style={{ paddingBottom: '100%' }}>
          {/* Loading */}
          {phase === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
              <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
              <p className="text-white/70 text-xs font-medium">{loadMsg}</p>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-6">
              <ShieldX className="w-10 h-10 text-red-400" />
              <p className="text-white/80 text-sm text-center font-medium">{loadMsg}</p>
              <button onClick={onClose} className="mt-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold">Tutup</button>
            </div>
          )}

          {/* Video */}
          <video ref={videoRef} playsInline muted
            className={`absolute inset-0 w-full h-full object-cover ${phase === 'captured' ? 'opacity-0' : 'opacity-100'}`}
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Captured preview */}
          {phase === 'captured' && capturedImg && (
            <img src={capturedImg} alt="captured" className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          )}

          {/* Face detection overlay */}
          {phase !== 'loading' && phase !== 'error' && phase !== 'captured' && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Dimmed corners */}
              <defs>
                <mask id="spotlight">
                  <rect width="100" height="100" fill="white" />
                  <circle cx="50" cy="50" r="38" fill="black" />
                </mask>
              </defs>
              <rect width="100" height="100" fill="rgba(0,0,0,0.35)" mask="url(#spotlight)" />

              {/* Oval guide */}
              <ellipse cx="50" cy="50" rx="34" ry="42"
                fill="none" strokeWidth="0.5"
                stroke={faceBox ? (faceScore && faceScore >= FACE_MATCH_THRESHOLD ? '#10b981' : '#f59e0b') : 'rgba(255,255,255,0.4)'}
              />

              {/* Face box */}
              {faceBox && (
                <rect x={faceBox.x} y={faceBox.y} width={faceBox.w} height={faceBox.h}
                  fill="none" strokeWidth="0.6" rx="1"
                  stroke={faceScore && faceScore >= FACE_MATCH_THRESHOLD ? '#10b981' : '#f59e0b'}
                />
              )}
            </svg>
          )}

          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/80 backdrop-blur flex items-center justify-center">
                <span className="text-white font-black text-4xl">{countdown}</span>
              </div>
            </div>
          )}

          {/* Success overlay */}
          {phase === 'captured' && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 drop-shadow-lg" />
            </div>
          )}

          {/* Score badge */}
          {faceScore !== null && phase !== 'captured' && (
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur rounded-lg px-2 py-1">
              <p className={`text-xs font-bold font-mono ${scoreColor}`}>
                {mode === 'register' ? `Conf: ${(faceScore * 100).toFixed(0)}%` : `Match: ${(faceScore * 100).toFixed(0)}%`}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-center text-[var(--text-muted)]">{cfg.hint}</p>

          {mode === 'register' || !registeredDescriptor ? (
            <button onClick={handleManualCapture}
              disabled={phase === 'loading' || phase === 'error' || phase === 'captured'}
              className="btn-primary w-full h-12">
              {phase === 'captured' ? <><CheckCircle2 className="w-4 h-4" /> Berhasil</> : <><Camera className="w-4 h-4" /> Ambil Foto</>}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Mendeteksi wajah secara otomatis...
            </div>
          )}

          {phase !== 'loading' && phase !== 'captured' && !registeredDescriptor && mode !== 'register' && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Wajah belum terdaftar — foto tetap diambil tanpa verifikasi
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// GOOGLE MAPS LOCATION CARD
// ════════════════════════════════════════════════════════════════
function MapCard({ lat, lng, officeLat, officeLng, distance, radius, title = 'Lokasi Absensi' }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!lat || !lng || !GMAPS_KEY) return;

    const loadMap = () => {
      if (!window.google) return;
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: parseFloat(lat), lng: parseFloat(lng) },
        zoom: 16,
        disableDefaultUI: true,
        gestureHandling: 'cooperative',
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8a9bb0' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3561' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
        ],
      });

      // User marker
      new window.google.maps.Marker({
        position: { lat: parseFloat(lat), lng: parseFloat(lng) },
        map,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#38bdf8', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 9 },
        title: 'Lokasi Anda',
      });

      // Office marker & radius circle
      if (officeLat && officeLng) {
        new window.google.maps.Marker({
          position: { lat: parseFloat(officeLat), lng: parseFloat(officeLng) },
          map,
          icon: { path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, fillColor: '#10b981', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 1, scale: 7 },
          title: 'Kantor',
        });
        new window.google.maps.Circle({
          map,
          center: { lat: parseFloat(officeLat), lng: parseFloat(officeLng) },
          radius: parseInt(radius || 100),
          strokeColor: '#10b981', strokeOpacity: 0.5, strokeWeight: 2,
          fillColor: '#10b981', fillOpacity: 0.08,
        });
      }
    };

    if (window.google) { loadMap(); return; }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}`;
    script.async = true;
    script.onload = loadMap;
    document.head.appendChild(script);
  }, [lat, lng, officeLat, officeLng]);

  if (!lat || !lng) return null;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          <Map className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-xs font-semibold text-[var(--text-primary)]">{title}</span>
        </div>
        {distance !== null && distance !== undefined && (
          <span className={`text-xs font-bold ${distance <= (radius || 100) ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {distance}m dari kantor
          </span>
        )}
      </div>
      {GMAPS_KEY ? (
        <div ref={mapRef} style={{ height: 160 }} className="w-full" />
      ) : (
        <div className="h-24 bg-[var(--bg-secondary)] flex items-center justify-center">
          <p className="text-xs text-[var(--text-muted)]">VITE_GOOGLE_MAPS_API_KEY belum dikonfigurasi</p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CLOCK TAB — Main check-in/out/break/resume
// ════════════════════════════════════════════════════════════════
function ClockTab({ todayData, onRefresh }) {
  const { user }     = useAuth();
  const clock        = useLiveClock();
  const attendance   = todayData?.attendance;
  const office       = todayData?.office;

  const [showCamera, setShowCamera]     = useState(false);
  const [cameraMode, setCameraMode]     = useState('check-in');
  const [gps, setGps]                   = useState(null);
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null);

  const hasCheckedIn  = !!attendance?.check_in;
  const hasCheckedOut = !!attendance?.check_out;
  const isOnBreak     = !!(attendance?.break_start && !attendance?.break_end);
  const isComplete    = hasCheckedIn && hasCheckedOut;

  // Fetch face status
  useEffect(() => {
    attendanceService.getFaceStatus()
      .then(r => { if (r.data.data.registered && r.data.data.face) { /* descriptor fetched on demand */ } })
      .catch(() => {});
    fetchGPS();
  }, []);

  const fetchGPS = async () => {
    setGpsLoading(true);
    try { setGps(await getGPSLocation()); } catch { setGps(null); } finally { setGpsLoading(false); }
  };

  const openCamera = (mode) => { setCameraMode(mode); setShowCamera(true); };

  const handleCapture = async ({ base64, descriptor, score, unverified }) => {
    setShowCamera(false);

    setActionLoading(true);
    try {
      const payload = {
        lat: gps?.lat, lng: gps?.lng,
        selfie_base64: base64,
        face_score: score || 0,
        face_verified: !unverified && score >= FACE_MATCH_THRESHOLD,
      };

      let res;
      if (cameraMode === 'check-in')  res = await attendanceService.checkIn(payload);
      if (cameraMode === 'check-out') res = await attendanceService.checkOut(payload);

      toast.success(res.data.message);
      if (!payload.face_verified) toast('⚠️ Wajah tidak terverifikasi — ditandai untuk review HR', { icon: '⚠️', duration: 5000 });
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal');
    } finally { setActionLoading(false); }
  };

  const handleBreak = async (action) => {
    setActionLoading(true);
    try {
      const res = action === 'start'
        ? await attendanceService.breakStart()
        : await attendanceService.breakEnd();
      toast.success(res.data.message);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
    finally { setActionLoading(false); }
  };

  // Determine main button state
  const btnState = isComplete ? 'done' : hasCheckedIn ? (isOnBreak ? 'onBreak' : 'checkout') : 'checkin';
  const BTN_CFG = {
    checkin:  { label: 'CHECK IN',  sublabel: clock.isLate ? `Terlambat · ${clock.timeShort}` : `Tepat Waktu · ${clock.timeShort}`, gradient: clock.isLate ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-500', ring: clock.isLate ? 'bg-amber-400/20' : 'bg-emerald-400/20', icon: LogIn, action: () => openCamera('check-in') },
    checkout: { label: 'CHECK OUT', sublabel: `Pulang · ${clock.timeShort}`, gradient: 'from-blue-500 to-indigo-600', ring: 'bg-blue-400/20', icon: LogOut, action: () => openCamera('check-out') },
    onBreak:  { label: 'RESUME',    sublabel: 'Kembali kerja', gradient: 'from-purple-500 to-violet-600', ring: 'bg-purple-400/20', icon: Play, action: () => handleBreak('end') },
    done:     { label: 'SELESAI',   sublabel: 'Absensi hari ini lengkap', gradient: 'from-slate-500 to-slate-600', ring: 'bg-slate-400/0', icon: CheckCircle2, action: () => {} },
  };
  const btn = BTN_CFG[btnState];

  // Distance calculation for display
  const distanceDisplay = gps && office?.lat && office?.lng
    ? calcDist(gps.lat, gps.lng, parseFloat(office.lat), parseFloat(office.lng))
    : null;
  const inRadius = distanceDisplay !== null && distanceDisplay <= (office?.radius || 100);

  return (
    <div className="flex flex-col items-center gap-5 py-2 animate-slide-up">
      {/* Clock */}
      <div className="text-center">
        <div className="text-5xl font-black tracking-tight text-[var(--text-primary)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {clock.timeStr}
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">{clock.dayStr}, {clock.dateStr} WIB</p>
        {clock.isLate && !hasCheckedIn && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs font-semibold">
            <AlertTriangle className="w-3 h-3" /> Melewati batas 08:05
          </div>
        )}
      </div>

      {/* GPS + Location status */}
      <div className="w-full flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {gpsLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />
          ) : gps ? (
            <Navigation className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          )}
          <span className="text-xs text-[var(--text-muted)]">
            {gpsLoading ? 'Mengambil GPS...' : gps ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : 'GPS tidak aktif'}
          </span>
        </div>
        {distanceDisplay !== null && (
          <span className={`text-xs font-semibold ${inRadius ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {inRadius ? '✓' : '⚠'} {distanceDisplay}m
          </span>
        )}
        <button onClick={fetchGPS} className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Main action button */}
      <div className="relative flex items-center justify-center my-2">
        {!isComplete && (
          <>
            <div className={`absolute w-52 h-52 rounded-full ${btn.ring} animate-ping opacity-75`} style={{ animationDuration: '2s' }} />
            <div className={`absolute w-44 h-44 rounded-full ${btn.ring} animate-ping opacity-40`} style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
          </>
        )}
        <button onClick={btn.action} disabled={actionLoading || isComplete}
          className={`relative w-40 h-40 rounded-full bg-gradient-to-br ${btn.gradient} flex flex-col items-center justify-center gap-2 shadow-2xl transition-all duration-200 ${!isComplete ? 'active:scale-90 hover:scale-105' : 'opacity-80'} disabled:cursor-not-allowed`}>
          {actionLoading
            ? <Loader2 className="w-10 h-10 text-white animate-spin" />
            : <><btn.icon className="w-10 h-10 text-white" strokeWidth={2} /><span className="text-white font-black text-sm tracking-widest">{btn.label}</span></>
          }
        </button>
      </div>

      <p className="text-sm text-[var(--text-secondary)] font-medium -mt-2">{btn.sublabel}</p>

      {/* Break / Resume secondary action */}
      {hasCheckedIn && !hasCheckedOut && (
        <button onClick={() => handleBreak(isOnBreak ? 'end' : 'start')} disabled={actionLoading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 border
            ${isOnBreak
              ? 'border-purple-300 dark:border-purple-800 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400'
              : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}>
          {isOnBreak ? <Play className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
          {isOnBreak ? 'Resume Kerja' : 'Mulai Istirahat'}
          {isOnBreak && attendance?.break_start && (
            <span className="text-xs opacity-60 ml-1">sejak {formatTime(attendance.break_start)}</span>
          )}
        </button>
      )}

      {/* Today summary card */}
      <div className="w-full card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Rekap Hari Ini</span>
          {attendance && <StatusBadge status={attendance.status} />}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Masuk',   value: formatTime(attendance?.check_in) },
            { label: 'Keluar',  value: formatTime(attendance?.check_out) },
            { label: 'Istirahat', value: attendance?.total_break_minutes ? `${attendance.total_break_minutes}m` : '—' },
            { label: 'Jam',     value: attendance?.work_hours ? `${attendance.work_hours}j` : '—' },
          ].map((s, i) => (
            <div key={i} className="bg-[var(--bg-secondary)] rounded-xl py-2.5">
              <p className="text-sm font-bold text-[var(--text-primary)]">{s.value}</p>
              <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Verification badges */}
        {attendance && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${attendance.check_in_face_verified ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'}`}>
              {attendance.check_in_face_verified ? <ShieldCheck className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />}
              Wajah {attendance.check_in_face_verified ? 'Terverifikasi' : 'Unverified'}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${attendance.check_in_location_verified ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'}`}>
              <MapPin className="w-3 h-3" />
              {attendance.check_in_location_verified ? 'Dalam Area' : 'Luar Area'} {attendance.check_in_distance ? `(${attendance.check_in_distance}m)` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Map card */}
      {gps && (
        <MapCard
          lat={gps.lat} lng={gps.lng}
          officeLat={office?.lat} officeLng={office?.lng}
          distance={distanceDisplay} radius={office?.radius}
          title="Lokasi GPS Kamu"
        />
      )}

      {/* Selfie preview */}
      {attendance?.check_in_selfie_url && (
        <div className="w-full card p-3">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Foto Absensi</p>
          <div className="flex gap-2">
            {attendance.check_in_selfie_url && (
              <div className="text-center">
                <img src={attendance.check_in_selfie_url} alt="check-in" className="w-20 h-20 rounded-xl object-cover border border-[var(--border)]" />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Masuk</p>
              </div>
            )}
            {attendance.check_out_selfie_url && (
              <div className="text-center">
                <img src={attendance.check_out_selfie_url} alt="check-out" className="w-20 h-20 rounded-xl object-cover border border-[var(--border)]" />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Keluar</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showCamera && (
        <CameraModal mode={cameraMode} onCapture={handleCapture} onClose={() => setShowCamera(false)} registeredDescriptor={faceDescriptor} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HISTORY TAB
// ════════════════════════════════════════════════════════════════
function HistoryTab() {
  const [records, setRecords] = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth]     = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getHistory({ month });
      setRecords(res.data.data.records);
      setStats(res.data.data.stats);
    } catch { toast.error('Gagal memuat riwayat'); } finally { setLoading(false); }
  }, [month]);

  useEffect(() => { fetch(); }, [fetch]);

  const changeMonth = dir => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  };
  const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const monthLabel = (() => { const [y,m] = month.split('-'); return `${MONTHS_ID[parseInt(m)-1]} ${y}`; })();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] active:scale-95">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{monthLabel}</h3>
        <button onClick={() => changeMonth(1)} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] active:scale-95">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Hari',  value: stats.total_days,           color: 'text-[var(--text-primary)]' },
            { label: 'Hadir', value: stats.present,              color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Telat', value: stats.late,                 color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Jam',   value: stats.total_hours,          color: 'text-brand-600 dark:text-brand-400' },
          ].map((s,i) => (
            <div key={i} className="card p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12"><Clock className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" /><p className="text-sm text-[var(--text-muted)]">Tidak ada data bulan ini</p></div>
      ) : (
        <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
          {records.map((rec, i) => (
            <div key={rec.id || i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="text-center w-10 flex-shrink-0">
                <p className="text-base font-bold text-[var(--text-primary)]">{rec.date.split('-')[2]}</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase">{new Date(rec.date+'T00:00:00').toLocaleDateString('id-ID',{weekday:'short'})}</p>
              </div>
              <div className="w-px h-10 bg-[var(--border)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5"><LogIn className="w-3 h-3 text-emerald-500" /><span className="text-sm font-semibold">{formatTime(rec.check_in)}</span></div>
                  {rec.check_out && <><span className="text-[var(--text-muted)] text-xs">→</span><div className="flex items-center gap-1.5"><LogOut className="w-3 h-3 text-blue-500" /><span className="text-sm font-semibold">{formatTime(rec.check_out)}</span></div></>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {rec.work_hours && <span className="text-xs text-[var(--text-muted)]">{rec.work_hours}j</span>}
                  {rec.total_break_minutes > 0 && <span className="text-xs text-[var(--text-muted)]">· {rec.total_break_minutes}m istirahat</span>}
                  {rec.check_in_face_verified && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                  {rec.check_in_location_verified && <MapPin className="w-3 h-3 text-emerald-500" />}
                </div>
              </div>
              {rec.check_in_selfie_url && <img src={rec.check_in_selfie_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-[var(--border)] flex-shrink-0" />}
              <StatusBadge status={rec.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MONITORING TAB (HR/Admin)
// ════════════════════════════════════════════════════════════════
function MonitoringTab() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const res = await attendanceService.getRealtimeMonitoring(); setData(res.data.data); }
    catch { toast.error('Gagal memuat monitoring'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); const t = setInterval(fetch, 60000); return () => clearInterval(t); }, [fetch]);

  if (loading) return <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>;
  if (!data) return null;

  const { summary, report } = data;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Monitoring Real-time</h3>
        <button onClick={fetch} className="w-8 h-8 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Hadir',   value: summary.present,     color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Telat',   value: summary.late,        color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Absen',   value: summary.absent,      color: 'text-red-600 dark:text-red-400' },
          { label: 'Istirahat', value: summary.on_break,  color: 'text-purple-600 dark:text-purple-400' },
        ].map((s,i) => (
          <div key={i} className="card p-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Map showing all check-ins */}
      {summary.office?.lat && (
        <MapCard
          lat={summary.office.lat} lng={summary.office.lng}
          officeLat={summary.office.lat} officeLng={summary.office.lng}
          distance={0} radius={summary.office.radius}
          title={`Peta Kantor · Radius ${summary.office.radius}m`}
        />
      )}

      <div className="card divide-y divide-[var(--border-subtle)] overflow-hidden">
        {report.map((emp, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
              {emp.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{emp.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-[var(--text-muted)] truncate">{emp.department}</p>
                {emp.attendance?.check_in && <span className="text-xs text-[var(--text-muted)]">· Masuk {formatTime(emp.attendance.check_in)}</span>}
                {emp.attendance?.check_in_selfie_url && <img src={emp.attendance.check_in_selfie_url} alt="" className="w-4 h-4 rounded object-cover inline" />}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {emp.attendance?.check_in_face_verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
              {emp.is_on_break ? (
                <span className="badge badge-info text-[10px]"><Coffee className="w-2.5 h-2.5" /> Istirahat</span>
              ) : (
                <StatusBadge status={emp.status} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function AttendancePage() {
  const { user, isHR } = useAuth();
  const canMonitor = isHR || user?.role === 'admin' || user?.role === 'supervisor';

  const TABS = [
    { id: 'clock',     label: 'Absen',     icon: Clock },
    { id: 'history',   label: 'Riwayat',   icon: Eye },
    ...(canMonitor ? [{ id: 'monitor', label: 'Monitor', icon: Users }] : []),
  ];

  const [activeTab, setActiveTab] = useState('clock');
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading]     = useState(true);

  const fetchToday = useCallback(async () => {
    try { const res = await attendanceService.getToday(); setTodayData(res.data.data); }
    catch { toast.error('Gagal memuat data absensi'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Absensi</h1>
          <p className="text-sm text-[var(--text-secondary)]">Face Recognition + GPS</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchToday} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
            <RefreshCw className="w-4 h-4" />
          </button>
          {isHR && (
            <button onClick={() => setActiveTab('monitor')} className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]">
              <Users className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex p-1 gap-1 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)] mb-5">
        {TABS.map(tab => { const Icon = tab.icon; const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${active ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm text-[var(--text-muted)]">Memuat...</p>
        </div>
      ) : (
        <>
          {activeTab === 'clock'   && <ClockTab todayData={todayData} onRefresh={fetchToday} />}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'monitor' && <MonitoringTab />}
        </>
      )}
    </div>
  );
}
