import { Clock, CalendarOff, DollarSign, Users, Settings, Hammer } from 'lucide-react';

const placeholders = {
  attendance: { icon: Clock, label: 'Absensi', color: 'text-brand-500', bg: 'bg-brand-100 dark:bg-brand-950', module: 'Module 2' },
  leaves: { icon: CalendarOff, label: 'Cuti', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950', module: 'Module 3' },
  payroll: { icon: DollarSign, label: 'Penggajian', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-950', module: 'Module 4' },
  employees: { icon: Users, label: 'Karyawan', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950', module: 'Module 5' },
  settings: { icon: Settings, label: 'Pengaturan', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-900', module: 'Module 6' },
};

function PlaceholderPage({ type }) {
  const info = placeholders[type];
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in text-center p-6">
      <div className={`w-20 h-20 ${info.bg} rounded-3xl flex items-center justify-center mb-5 shadow-sm`}>
        <info.icon className={`w-10 h-10 ${info.color}`} />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="badge badge-warning">
          <Hammer className="w-3 h-3" /> {info.module}
        </span>
      </div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        Halaman {info.label}
      </h2>
      <p className="text-sm text-[var(--text-secondary)] max-w-xs">
        Modul ini akan dibangun pada tahap berikutnya. Setiap modul dibangun secara bertahap dan production-ready.
      </p>
    </div>
  );
}

export const AttendancePage = () => <PlaceholderPage type="attendance" />;
export const LeavesPage = () => <PlaceholderPage type="leaves" />;
export const PayrollPage = () => <PlaceholderPage type="payroll" />;
export const EmployeesPage = () => <PlaceholderPage type="employees" />;
export const SettingsPage = () => <PlaceholderPage type="settings" />;
