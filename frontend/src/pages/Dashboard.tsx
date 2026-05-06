import {
  AlertCircle,
  CalendarDays,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import MedicationCard from '../components/MedicationCard';
import { getAdherence, getDailySchedule, getPatient } from '../services/api';
import type { AdherenceSummary, DoseLog, Patient, ScheduledMedication } from '../types';
import { useAuth } from '../auth/AuthContext';

// Returns YYYY-MM-DD for a date offset by `daysAgo` from today (UTC)
function utcDateString(daysAgo = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const ADHERENCE_RANGES = [
  { label: 'Last 7 days',  days: 7  },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<ScheduledMedication[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adherence
  const [adherenceDays, setAdherenceDays] = useState(30);
  const [adherence, setAdherence] = useState<AdherenceSummary | null>(null);
  const [adherenceLoading, setAdherenceLoading] = useState(false);

  // Patient-only route: load this user's linked patient record.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setPatientsLoading(true);
    setError(null);

    const load = async () => {
      if (user.patientId == null) {
        if (!cancelled) {
          setError('This account is not linked to a patient profile.');
          setPatientsLoading(false);
        }
        return;
      }
      try {
        const p = await getPatient(user.patientId);
        if (cancelled) return;
        setPatients([p]);
        setSelectedPatientId(p.PatientID);
      } catch {
        if (!cancelled) setError('Failed to load your profile.');
      } finally {
        if (!cancelled) setPatientsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load schedule whenever the selected patient changes
  useEffect(() => {
    if (selectedPatientId === null) return;
    setScheduleLoading(true);
    setError(null);
    getDailySchedule(selectedPatientId)
      .then(setSchedule)
      .catch(() => setError("Failed to load today's schedule."))
      .finally(() => setScheduleLoading(false));
  }, [selectedPatientId]);

  // Load adherence whenever patient or range changes
  useEffect(() => {
    if (selectedPatientId === null) return;
    setAdherenceLoading(true);
    const from = utcDateString(adherenceDays - 1);
    const to   = utcDateString(0);
    getAdherence(selectedPatientId, from, to)
      .then(setAdherence)
      .catch(() => setAdherence(null))
      .finally(() => setAdherenceLoading(false));
  }, [selectedPatientId, adherenceDays]);

  // Optimistically update the card when a dose is logged
  const handleLogged = useCallback((prescriptionId: number, log: DoseLog) => {
    setSchedule((prev) =>
      prev.map((med) =>
        med.PrescriptionID === prescriptionId ? { ...med, TodayLog: log } : med,
      ),
    );
  }, []);

  const canLogDose = Boolean(user?.roles.includes('patient'));

  const selectedPatient = patients.find((p) => p.PatientID === selectedPatientId);

  const takenCount   = schedule.filter((m) => m.TodayLog?.Status === 'Taken').length;
  const missedCount  = schedule.filter((m) => m.TodayLog?.Status === 'Missed' || m.TodayLog?.Status === 'Late').length;
  const pendingCount = schedule.filter((m) => m.TodayLog === null).length;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  if (patientsLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            <span>{today}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Daily Schedule</h1>
        </div>

        {selectedPatient ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm">
            {selectedPatient.FirstName} {selectedPatient.LastName}
          </div>
        ) : null}
      </div>

      {/* Today's summary stats */}
      {selectedPatient && !scheduleLoading && schedule.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Pending"      value={pendingCount} color="text-slate-600"  bg="bg-slate-50" />
          <StatCard label="Taken"        value={takenCount}   color="text-emerald-700" bg="bg-emerald-50" />
          <StatCard label="Missed / Late" value={missedCount}  color="text-red-600"    bg="bg-red-50" />
        </div>
      )}

      {/* Adherence panel */}
      {selectedPatient && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-600" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900">Adherence</h2>
            </div>
            <div className="flex gap-1">
              {ADHERENCE_RANGES.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => setAdherenceDays(days)}
                  className={[
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    adherenceDays === days
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {adherenceLoading ? (
            <div className="mt-4 flex items-center justify-center py-6 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : adherence ? (
            <div className="mt-4 space-y-3">
              {/* Progress bar */}
              <div>
                <div className="mb-1 flex items-end justify-between">
                  <span className="text-xs text-slate-500">Overall adherence</span>
                  <span className="text-2xl font-bold text-slate-900">{adherence.AdherencePct}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-500"
                    style={{ width: `${adherence.AdherencePct}%` }}
                  />
                </div>
              </div>
              {/* Breakdown */}
              <div className="grid grid-cols-4 gap-3 pt-1">
                <AdherenceStat label="Total Doses" value={adherence.TotalDoses} color="text-slate-700" />
                <AdherenceStat label="Taken"       value={adherence.Taken}      color="text-emerald-700" />
                <AdherenceStat label="Missed"      value={adherence.Missed}     color="text-red-600" />
                <AdherenceStat label="Late"        value={adherence.Late}       color="text-amber-600" />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-center text-sm text-slate-400">No dose data for this period.</p>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Schedule loading */}
      {scheduleLoading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="ml-2 text-sm">Loading schedule…</span>
        </div>
      )}

      {/* Medication cards */}
      {!scheduleLoading && !error && schedule.length > 0 && (
        <div className="space-y-3">
          {schedule.map((med) => (
            <MedicationCard
              key={med.PrescriptionID}
              med={med}
              onLogged={handleLogged}
              canLog={canLogDose}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!scheduleLoading && !error && schedule.length === 0 && selectedPatientId !== null && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <CalendarDays className="h-10 w-10 text-slate-300" aria-hidden="true" />
          <div>
            <p className="font-medium text-slate-700">No medications scheduled</p>
            <p className="mt-0.5 text-sm text-slate-400">
              {selectedPatient?.FirstName} has no active prescriptions for today.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, color, bg,
}: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl ${bg} px-5 py-4`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function AdherenceStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
