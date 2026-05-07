import { AlertCircle, Loader2, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getDoctors, getPatients, updatePatientPrimaryDoctor } from '../services/api';
import type { Doctor, Patient } from '../types';

/** Patient's primary first; if none yet, secretary's linked doctor; then remaining A→Z by name. */
function doctorsOrderedForPatientRow(
  allDoctors: Doctor[],
  patientPrimaryDoctorId: number | null | undefined,
  secretaryBossDoctorId: number | null | undefined,
): Doctor[] {
  const byId = new Map(allDoctors.map((d) => [d.DoctorID, d]));
  const orderedIds: number[] = [];

  const appendUnique = (id: number | null | undefined) => {
    if (id == null || !Number.isFinite(Number(id))) return;
    const n = Number(id);
    if (!byId.has(n) || orderedIds.includes(n)) return;
    orderedIds.push(n);
  };

  appendUnique(patientPrimaryDoctorId);
  if (patientPrimaryDoctorId == null) appendUnique(secretaryBossDoctorId);

  const preferred = new Set(orderedIds);
  const rest = allDoctors
    .filter((d) => !preferred.has(d.DoctorID))
    .sort((a, b) =>
      `${a.LastName} ${a.FirstName}`.localeCompare(`${b.LastName} ${b.FirstName}`, undefined, {
        sensitivity: 'base',
      }),
    );

  return [...orderedIds.map((id) => byId.get(id)!), ...rest];
}

export default function SecretaryDashboard() {
  const { user } = useAuth();
  const secretaryDoctorId =
    user?.roles.includes('secretary') && user.doctorId != null ? user.doctorId : null;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [p, d] = await Promise.all([getPatients(), getDoctors()]);
        setPatients(p);
        setDoctors(d);
      } catch {
        setError('Failed to load patients/doctors.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const doctorNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of doctors) map.set(d.DoctorID, `Dr. ${d.FirstName} ${d.LastName}`);
    return map;
  }, [doctors]);

  async function setPrimaryDoctor(patientId: number, doctorId: number | null) {
    setSavingIds((prev) => new Set(prev).add(patientId));
    try {
      const updated = await updatePatientPrimaryDoctor(patientId, doctorId);
      setPatients((prev) => prev.map((p) => (p.PatientID === patientId ? updated : p)));
    } catch {
      setError('Failed to update primary doctor.');
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(patientId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <UserRound className="h-4 w-4" aria-hidden="true" />
          <span>Assignments</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Secretary</h1>
        <p className="mt-0.5 text-sm text-slate-500">Assign a primary doctor to each patient.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
              <th className={thCls}>Patient</th>
              <th className={thCls}>Email</th>
              <th className={thCls}>Primary doctor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patients.map((p) => {
              const saving = savingIds.has(p.PatientID);
              const doctorsForRow = doctorsOrderedForPatientRow(
                doctors,
                p.PrimaryDoctorID,
                secretaryDoctorId,
              );
              return (
                <tr key={p.PatientID} className="transition-colors hover:bg-slate-50">
                  <td className={tdCls}>
                    <div className="font-medium text-slate-900">
                      {p.FirstName} {p.LastName}
                    </div>
                    <div className="text-xs text-slate-500">#{p.PatientID}</div>
                  </td>
                  <td className={tdCls}>{p.Email}</td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-2">
                      <select
                        value={p.PrimaryDoctorID ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          void setPrimaryDoctor(p.PatientID, v ? Number(v) : null);
                        }}
                        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
                        disabled={saving}
                        title="Primary doctor"
                      >
                        <option value="">Unassigned</option>
                        {doctorsForRow.map((d) => (
                          <option key={d.DoctorID} value={d.DoctorID}>
                            {doctorNameById.get(d.DoctorID) ?? `Dr. ${d.FirstName} ${d.LastName}`}
                          </option>
                        ))}
                      </select>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thCls = 'px-4 py-3 text-left';
const tdCls = 'px-4 py-3 text-slate-700';

