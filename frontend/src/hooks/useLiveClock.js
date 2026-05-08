import { useState, useEffect } from 'react';

/**
 * Returns live WIB time updated every second.
 * { hours, minutes, seconds, timeStr, dateStr, dayStr, isLate }
 */
export const useLiveClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Convert to WIB (UTC+7)
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const hours   = wib.getUTCHours();
  const minutes = wib.getUTCMinutes();
  const seconds = wib.getUTCSeconds();

  const pad = (n) => String(n).padStart(2, '0');

  const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  // Late if after 08:05
  const isLate = hours > 8 || (hours === 8 && minutes >= 5);

  return {
    hours,
    minutes,
    seconds,
    timeStr:  `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    timeShort:`${pad(hours)}:${pad(minutes)}`,
    dateStr:  `${wib.getUTCDate()} ${MONTHS[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`,
    dayStr:   DAYS[wib.getUTCDay()],
    isLate,
    totalMinutes: hours * 60 + minutes,
    wib,
  };
};
