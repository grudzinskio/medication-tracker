import { CheckCircle2, Clock, Pill, UserRound, XCircle } from 'lucide-react';
import { useState } from 'react';
import { logDose } from '../services/api';
import type { DoseLog, DoseStatus, ScheduledMedication } from '../types';

interface Props {
  med: ScheduledMedication;
  onLogged: (prescriptionId: number, log: DoseLog) => void;
  canLog?: boolean;
}

const statusConfig: Record<DoseStatus, { label: string; classes: string; icon: React.ReactNode }> = {
  Taken: {
    label: 'Taken',
    classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  Missed: {
    label: 'Missed',
    classes: 'bg-red-50 text-red-600 ring-1 ring-red-200',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  Late: {
    label: 'Late',
    classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
};

export default function MedicationCard({ med, onLogged, canLog = true }: Props) {
  const [loading, setLoading] = useState<DoseStatus | null>(null);

  async function handleLog(status: DoseStatus) {
    setLoading(status);
    try {
      const newLog = await logDose({ PrescriptionID: med.PrescriptionID, Status: status });
      onLogged(med.PrescriptionID, newLog);
    } finally {
      setLoading(null);
    }
  }

  const todayStatus = med.TodayLog?.Status ?? null;
  const logged = todayStatus !== null;
  const badge = todayStatus ? statusConfig[todayStatus] : null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-start sm:justify-between">
      {/* Left: med info */}
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 ring-1 ring-teal-100">
          <Pill className="h-5 w-5 text-teal-600" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{med.DrugName}</h3>
            {med.GenericName !== med.DrugName && (
              <span className="text-xs text-slate-400">({med.GenericName})</span>
            )}
            {badge && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.classes}`}>
                {badge.icon}
                {badge.label}
              </span>
            )}
          </div>

          <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <dt className="font-medium text-slate-400">Dose</dt>
              <dd>{med.Dosage}</dd>
            </div>
            <div className="flex items-center gap-1">
              <dt className="font-medium text-slate-400">Frequency</dt>
              <dd>{med.Frequency}</dd>
            </div>
            <div className="flex items-center gap-1">
              <dt className="font-medium text-slate-400">Form</dt>
              <dd>{med.Form} · {med.Route}</dd>
            </div>
          </dl>

          <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Dr. {med.DoctorFirstName} {med.DoctorLastName}</span>
          </div>
        </div>
      </div>

      {/* Right: action buttons */}
      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
        {logged ? (
          <p className="text-xs text-slate-400">
            Logged at{' '}
            {new Date(med.TodayLog!.TimeTaken).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        ) : !canLog ? (
          <p className="text-xs text-slate-400">View only</p>
        ) : (
          <>
            <button
              onClick={() => handleLog('Taken')}
              disabled={loading !== null}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {loading === 'Taken' ? 'Logging…' : 'Take Dose'}
            </button>
            <button
              onClick={() => handleLog('Missed')}
              disabled={loading !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              {loading === 'Missed' ? 'Logging…' : 'Missed Dose'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
