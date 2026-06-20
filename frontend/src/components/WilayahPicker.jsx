import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Check, Search, Loader2, MapPin, X } from 'lucide-react';
import { getProvinces, getRegencies, getDistricts, getVillages, toTitleCase } from '../utils/wilayah';

// ════════════════════════════════════════════════════════════════════
// WilayahPicker
// Cascade dropdown 4 level: Provinsi → Kab/Kota → Kecamatan → Kelurahan
// Data dari emsifa/api-wilayah-indonesia (cached di localStorage).
//
// value = {
//   province_code, province_name,
//   city_code, city_name,
//   district_code, district_name,
//   village_code, village_name,
// }
// onChange(newValue) — dipanggil setiap pilihan berubah
// ════════════════════════════════════════════════════════════════════

const SingleSelect = ({ label, items, value, onChange, loading, disabled, placeholder }) => {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Focus search when open
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const filtered = (items || []).filter(i =>
    !query || i.name.toLowerCase().includes(query.toLowerCase())
  );

  const selectedName = value ? toTitleCase(items?.find(i => i.id === value)?.name || '') : '';

  return (
    <div className="relative" ref={wrapRef}>
      <label className="field-label">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`input-base w-full text-left flex items-center justify-between gap-2 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--brand-500)]'
        }`}
      >
        <span className={selectedName ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin"/>Memuat...</span>
          ) : (selectedName || placeholder || `Pilih ${label.toLowerCase()}`)}
        </span>
        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-[var(--border)] flex items-center gap-2">
            <Search size={13} className="text-[var(--text-muted)] flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Cari ${label.toLowerCase()}...`}
              className="bg-transparent text-xs outline-none w-full text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="text-center py-6 text-[var(--text-muted)] text-xs">Memuat data...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-[var(--text-muted)] text-xs">Tidak ada hasil</div>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onChange(item); setOpen(false); setQuery(''); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] flex items-center justify-between gap-2 ${
                    value === item.id ? 'bg-[var(--brand-500)]/10 text-[var(--brand-600)] font-semibold' : 'text-[var(--text-primary)]'
                  }`}
                >
                  <span>{toTitleCase(item.name)}</span>
                  {value === item.id && <Check size={12} className="text-[var(--brand-600)]" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────
export default function WilayahPicker({ value = {}, onChange, className = '' }) {
  const [provinces, setProvinces]   = useState([]);
  const [regencies, setRegencies]   = useState([]);
  const [districts, setDistricts]   = useState([]);
  const [villages, setVillages]     = useState([]);
  const [loadingP, setLoadingP] = useState(false);
  const [loadingR, setLoadingR] = useState(false);
  const [loadingD, setLoadingD] = useState(false);
  const [loadingV, setLoadingV] = useState(false);
  const [error, setError] = useState(null);

  const v = value || {};

  // Initial load provinces
  useEffect(() => {
    let mounted = true;
    setLoadingP(true);
    getProvinces()
      .then(data => { if (mounted) { setProvinces(data); setError(null); } })
      .catch(e => mounted && setError('Gagal memuat data provinsi: ' + e.message))
      .finally(() => mounted && setLoadingP(false));
    return () => { mounted = false; };
  }, []);

  // Load regencies when province changes
  useEffect(() => {
    if (!v.province_code) { setRegencies([]); return; }
    let mounted = true;
    setLoadingR(true);
    getRegencies(v.province_code)
      .then(data => { if (mounted) setRegencies(data); })
      .catch(() => mounted && setRegencies([]))
      .finally(() => mounted && setLoadingR(false));
    return () => { mounted = false; };
  }, [v.province_code]);

  // Load districts when city changes
  useEffect(() => {
    if (!v.city_code) { setDistricts([]); return; }
    let mounted = true;
    setLoadingD(true);
    getDistricts(v.city_code)
      .then(data => { if (mounted) setDistricts(data); })
      .catch(() => mounted && setDistricts([]))
      .finally(() => mounted && setLoadingD(false));
    return () => { mounted = false; };
  }, [v.city_code]);

  // Load villages when district changes
  useEffect(() => {
    if (!v.district_code) { setVillages([]); return; }
    let mounted = true;
    setLoadingV(true);
    getVillages(v.district_code)
      .then(data => { if (mounted) setVillages(data); })
      .catch(() => mounted && setVillages([]))
      .finally(() => mounted && setLoadingV(false));
    return () => { mounted = false; };
  }, [v.district_code]);

  const handleProvince = useCallback((item) => {
    onChange?.({
      province_code: item.id,
      province_name: toTitleCase(item.name),
      province: toTitleCase(item.name),    // backward compat dgn field lama
      city_code: null, city_name: null, city: null,
      district_code: null, district_name: null, district: null,
      village_code: null, village_name: null, village: null,
    });
  }, [onChange]);

  const handleCity = useCallback((item) => {
    onChange?.({
      ...v,
      city_code: item.id,
      city_name: toTitleCase(item.name),
      city: toTitleCase(item.name),
      district_code: null, district_name: null, district: null,
      village_code: null, village_name: null, village: null,
    });
  }, [onChange, v]);

  const handleDistrict = useCallback((item) => {
    onChange?.({
      ...v,
      district_code: item.id,
      district_name: toTitleCase(item.name),
      district: toTitleCase(item.name),
      village_code: null, village_name: null, village: null,
    });
  }, [onChange, v]);

  const handleVillage = useCallback((item) => {
    onChange?.({
      ...v,
      village_code: item.id,
      village_name: toTitleCase(item.name),
      village: toTitleCase(item.name),
    });
  }, [onChange, v]);

  return (
    <div className={`space-y-3 ${className}`}>
      {error && (
        <div className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 flex items-center gap-2">
          <MapPin size={12} /> {error} — silakan refresh atau isi alamat manual.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SingleSelect
          label="Provinsi"
          items={provinces}
          value={v.province_code}
          onChange={handleProvince}
          loading={loadingP}
          placeholder="Pilih provinsi"
        />
        <SingleSelect
          label="Kabupaten / Kota"
          items={regencies}
          value={v.city_code}
          onChange={handleCity}
          loading={loadingR}
          disabled={!v.province_code}
          placeholder={v.province_code ? 'Pilih kab/kota' : 'Pilih provinsi dulu'}
        />
        <SingleSelect
          label="Kecamatan"
          items={districts}
          value={v.district_code}
          onChange={handleDistrict}
          loading={loadingD}
          disabled={!v.city_code}
          placeholder={v.city_code ? 'Pilih kecamatan' : 'Pilih kab/kota dulu'}
        />
        <SingleSelect
          label="Kelurahan / Desa"
          items={villages}
          value={v.village_code}
          onChange={handleVillage}
          loading={loadingV}
          disabled={!v.district_code}
          placeholder={v.district_code ? 'Pilih kelurahan' : 'Pilih kecamatan dulu'}
        />
      </div>
    </div>
  );
}
