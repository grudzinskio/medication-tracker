import { AlertCircle, CalendarDays, ChevronDown, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import MedicationCard from '../components/MedicationCard';
import { getDailySchedule, getPatients } from '../services/api';
import type { DoseLog, Patient, ScheduledMedication } from '../types';

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<ScheduledMedication[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load patient list on mount
  useEffect(() => {
    getPatients()
      .then((data) => {
        setPatients(data);
        if (data.length > 0) setSelectedPatientId(data[0].PatientID);
      })
      .catch(() => setError('Failed to load patients.'))
      .finally(() => setPatientsLoading(false));
  }, []);

  // Load schedule whenever the selected patient changes
  useEffect(() => {
    if (selectedPatientId === null) return;
    setScheduleLoading(true);
    setError(null);
    getDailySchedule(selectedPatientId)
      .then(setSchedule)
      .catch(() => setError('Failed to load today\'s schedule.'))
      .finally(() => setScheduleLoading(false));
  }, [selectedPatientId]);

  // Optimistically update the card when a dose is logged
  const handleLogged = useCallback((prescriptionId: number, log: DoseLog) => {
    setSchedule((prev) =>
      prev.map((med) =>
        med.PrescriptionID === prescriptionId ? { ...med, TodayLog: log } : med
      )
    );
  }, []);

  const selectedPatient = patients.find((p) => p.PatientID === selectedPatientId);

  const takenCount = schedule.filter((m) => m.TodayLog?.Status === 'Taken').length;
  const missedCount = schedule.filter((m) => m.TodayLog?.Status === 'Missed' || m.TodayLog?.Status === 'Late').length;
  const pendingCount = schedule.filter((m) => m.TodayLog === null).length;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  if (patientsLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm">Loading patients…</span>
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
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Daily Schedule
          </h1>
        </div>

        {/* Patient selector */}
        <div className="relative">
          <label htmlFor="patient-select" className="sr-only">Select patient</label>
          <select
            id="patient-select"
            value={selectedPatientId ?? ''}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {patients.map((p) => (
              <option key={p.PatientID} value={p.PatientID}>
                {p.FirstName} {p.LastName}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        </div>
      </div>

      {/* Summary stats */}
      {selectedPatient && !scheduleLoading && schedule.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Pending" value={pendingCount} color="text-slate-600" bg="bg-slate-50" />
          <StatCard label="Taken" value={takenCount} color="text-emerald-700" bg="bg-emerald-50" />
          <StatCard label="Missed / Late" value={missedCount} color="text-red-600" bg="bg-red-50" />
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
            <MedicationCard key={med.PrescriptionID} med={med} onLogged={handleLogged} />
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
}: {
  label: string; value: number; color: string; bg: string;
}) {
  return (
    <div className={`rounded-2xl ${bg} px-5 py-4`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
