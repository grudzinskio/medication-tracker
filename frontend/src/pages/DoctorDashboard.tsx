import {
  AlertCircle,
  CalendarRange,
  ChevronRight,
  Download,
  Loader2,
  Mail,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useAuth } from '../auth/AuthContext';
import { emailPatientFromDoctor, getDoctorDashboard, getPatient } from '../services/api';
import type { DoctorDashboardPatientRow, DoctorDashboardResponse } from '../types';

type PatientSortKey = 'name' | 'adherence' | 'missedToday' | 'lastLogAt';

type EmailSendSuccess = {
  to: string;
  delivery: 'smtp' | 'ethereal' | 'console';
  previewUrl: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function utcDateString(daysAgo = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function csvEscape(s: string | number | null | undefined): string {
  const t = s === null || s === undefined ? '' : String(s);
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEmail = Boolean(user?.roles.includes('doctor') || user?.roles.includes('admin'));
  const [days, setDays] = useState(30);
  const [lowThresholdPct, setLowThresholdPct] = useState(80);
  const [noRecentLogsDays, setNoRecentLogsDays] = useState(7);
  const [query, setQuery] = useState('');
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [sortBy, setSortBy] = useState<PatientSortKey>('adherence');

  const [data, setData] = useState<DoctorDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [emailPatient, setEmailPatient] = useState<{ id: number; name: string } | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<EmailSendSuccess | null>(null);

  const from = useMemo(() => utcDateString(days - 1), [days]);
  const to = useMemo(() => utcDateString(0), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await getDoctorDashboard({ from, to, lowThresholdPct, noRecentLogsDays });
        if (!cancelled) setData(res);
      } catch {
        if (!cancelled) setError('Failed to load doctor dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [from, to, lowThresholdPct, noRecentLogsDays]);

  useEffect(() => {
    if (!emailPatient) return;
    let cancelled = false;
    setEmailTo('');
    getPatient(emailPatient.id)
      .then((pt) => {
        if (!cancelled) setEmailTo(pt.Email);
      })
      .catch(() => {
        if (!cancelled) setEmailTo('');
      });
    return () => {
      cancelled = true;
    };
  }, [emailPatient]);

  function closeEmailModal() {
    setEmailPatient(null);
    setEmailTo('');
    setEmailSubject('');
    setEmailBody('');
    setEmailErr(null);
  }

  const emailToValid = !emailTo.trim() || EMAIL_RE.test(emailTo.trim());

  const trendMax = useMemo(() => {
    if (!data || data.trend.length === 0) return 0;
    return Math.max(...data.trend.map((t) => t.TotalDoses));
  }, [data]);

  const filteredPatients = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();

    const now = Date.now();
    const list = data.patients.filter((p) => {
      if (q) {
        const name = `${p.FirstName} ${p.LastName}`.toLowerCase();
        if (!name.includes(q) && !String(p.PatientID).includes(q)) return false;
      }
      if (onlyAlerts) {
        const low = p.TotalDoses > 0 && p.AdherencePct < lowThresholdPct;
        const missedToday = p.MissedTodayCount > 0;
        const noRecent =
          p.LastLogAt &&
          Math.floor((now - new Date(p.LastLogAt).getTime()) / (1000 * 60 * 60 * 24)) >= noRecentLogsDays;
        if (!low && !missedToday && !noRecent) return false;
      }
      return true;
    });

    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return `${a.LastName}${a.FirstName}`.localeCompare(`${b.LastName}${b.FirstName}`);
      }
      if (sortBy === 'missedToday') {
        return (b.MissedTodayCount ?? 0) - (a.MissedTodayCount ?? 0);
      }
      if (sortBy === 'lastLogAt') {
        const at = a.LastLogAt ? new Date(a.LastLogAt).getTime() : 0;
        const bt = b.LastLogAt ? new Date(b.LastLogAt).getTime() : 0;
        return bt - at;
      }
      // adherence (default): lowest first
      return (a.AdherencePct ?? 0) - (b.AdherencePct ?? 0);
    });

    return sorted;
  }, [data, query, onlyAlerts, lowThresholdPct, noRecentLogsDays, sortBy]);

  function handleExportCsv() {
    if (!data) return;
    const rows: DoctorDashboardPatientRow[] = filteredPatients;
    const header = [
      'PatientID',
      'FirstName',
      'LastName',
      'AdherencePct',
      'Taken',
      'Missed',
      'Late',
      'ActiveRxCount',
      'MissedTodayCount',
      'LastLogAt',
    ];
    const lines = [header.join(',')];
    for (const p of rows) {
      lines.push(
        [
          p.PatientID,
          csvEscape(p.FirstName),
          csvEscape(p.LastName),
          p.AdherencePct,
          p.Taken,
          p.Missed,
          p.Late,
          p.ActiveRxCount,
          p.MissedTodayCount,
          csvEscape(p.LastLogAt),
        ].join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctor-dashboard-${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSendEmail() {
    if (!emailPatient || !emailToValid) return;
    setEmailSending(true);
    setEmailErr(null);
    try {
      const trimmed = emailTo.trim();
      const res = await emailPatientFromDoctor({
        patientId: emailPatient.id,
        subject: emailSubject,
        body: emailBody,
        ...(trimmed ? { to: trimmed } : {}),
      });
      setEmailSuccess({
        to: res.to,
        delivery: res.delivery,
        previewUrl: res.previewUrl,
      });
    } catch {
      setEmailErr('Could not send email. Configure SMTP in server .env or check the console log.');
    } finally {
      setEmailSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm">Loading dashboard…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>All patients overview</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Doctor Dashboard</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data && !error ? (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Download className="h-4 w-4 text-slate-500" />
              Export CSV
            </button>
          ) : null}
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={[
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  days === r.days ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                ].join(' ')}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm sm:flex">
            <CalendarRange className="h-4 w-4 text-slate-400" />
            <span className="font-mono">{from}</span>
            <span>→</span>
            <span className="font-mono">{to}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {data && !error ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Patients" value={data.aggregate.Patients} sub={`${data.aggregate.PatientsBelowPct} below ${lowThresholdPct}%`} />
            <StatCard label="Overall adherence" value={`${data.aggregate.AdherencePct}%`} sub={`${data.aggregate.TotalDoses} total doses`} />
            <StatCard label="Missed" value={data.aggregate.Missed} sub="In selected range" />
            <StatCard label="Late" value={data.aggregate.Late} sub="In selected range" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-teal-600" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-slate-900">Trend (total doses/day)</h2>
                </div>
                <div className="text-xs text-slate-500">{days}-day view</div>
              </div>

              {data.trend.length === 0 ? (
                <p className="mt-4 text-center text-sm text-slate-400">No dose data for this period.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {data.trend.slice(-14).map((t) => {
                    return (
                      <div key={t.Date} className="flex items-center gap-3">
                        <div className="w-24 shrink-0 font-mono text-[11px] text-slate-500">{t.Date}</div>
                        <progress
                          className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-teal-500 [&::-moz-progress-bar]:bg-teal-500"
                          value={t.TotalDoses}
                          max={trendMax || 1}
                        />
                        <div className="w-16 shrink-0 text-right text-xs font-medium text-slate-700">{t.TotalDoses}</div>
                      </div>
                    );
                  })}
                  <p className="pt-1 text-[11px] text-slate-400">
                    Showing the most recent 14 days in the selected range.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">Alerts</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <label className="flex items-center gap-1.5">
                    <span>Low</span>
                    <input
                      className="w-14 rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs outline-none focus:ring-2 focus:ring-teal-200"
                      value={lowThresholdPct}
                      onChange={(e) => setLowThresholdPct(Number(e.target.value || 0))}
                      inputMode="numeric"
                    />
                    <span>%</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span>No logs</span>
                    <input
                      className="w-14 rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs outline-none focus:ring-2 focus:ring-teal-200"
                      value={noRecentLogsDays}
                      onChange={(e) => setNoRecentLogsDays(Number(e.target.value || 0))}
                      inputMode="numeric"
                    />
                    <span>d</span>
                  </label>
                </div>
              </div>

              {data.alerts.length === 0 ? (
                <p className="mt-4 text-center text-sm text-slate-400">No alerts right now.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.alerts.slice(0, 12).map((a, idx) => (
                    <li key={`${a.type}-${a.PatientID}-${idx}`} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {a.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Patients</h2>
              <div className="text-xs text-slate-500">
                Showing {filteredPatients.length} of {data.patients.length}. Click a patient to manage prescriptions.
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search patients…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
                  <span>Sort</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as PatientSortKey)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
                    title="Sort patients"
                    aria-label="Sort patients"
                  >
                    <option value="adherence">Adherence (low → high)</option>
                    <option value="missedToday">Missed today (high → low)</option>
                    <option value="lastLogAt">Last log (recent → old)</option>
                    <option value="name">Name (A → Z)</option>
                  </select>
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
                  <input
                    type="checkbox"
                    checked={onlyAlerts}
                    onChange={(e) => setOnlyAlerts(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-200"
                    title="Show only patients with alerts"
                  />
                  <span>Only alerts</span>
                </label>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-2 pr-4">Patient</th>
                    <th className="py-2 pr-4">Adherence</th>
                    <th className="py-2 pr-4">Taken</th>
                    <th className="py-2 pr-4">Missed</th>
                    <th className="py-2 pr-4">Late</th>
                    <th className="py-2 pr-4">Active Rx</th>
                    <th className="py-2 pr-4">Missed today</th>
                    <th className="py-2 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p) => (
                    <tr key={p.PatientID} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-4 font-medium text-slate-800">
                        {p.FirstName} {p.LastName}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                          {p.AdherencePct}%
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-slate-700">{p.Taken}</td>
                      <td className="py-2 pr-4 text-slate-700">{p.Missed}</td>
                      <td className="py-2 pr-4 text-slate-700">{p.Late}</td>
                      <td className="py-2 pr-4 text-slate-700">{p.ActiveRxCount}</td>
                      <td className="py-2 pr-4 text-slate-700">{p.MissedTodayCount}</td>
                      <td className="py-2 pr-0 text-right">
                        <div className="flex justify-end gap-1.5">
                          {canEmail ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEmailPatient({
                                  id: p.PatientID,
                                  name: `${p.FirstName} ${p.LastName}`,
                                });
                                setEmailSubject('Message from your care team');
                                setEmailBody('');
                                setEmailErr(null);
                                setEmailSuccess(null);
                                setEmailTo('');
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              title="Email patient"
                            >
                              <Mail className="h-4 w-4 text-slate-500" />
                              Email
                            </button>
                          ) : null}
                          <button
                            onClick={() => navigate(`/prescriptions?patientId=${p.PatientID}`)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Manage
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {emailPatient && (
        <Modal title={`Email ${emailPatient.name}`} onClose={closeEmailModal} size="max-w-lg">
          {emailSuccess ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
                <p className="font-semibold text-teal-900">Message sent successfully</p>
                <p className="mt-1 text-xs text-teal-800/90">
                  <span className="font-medium">To:</span> {emailSuccess.to}
                </p>
                {emailSuccess.delivery === 'smtp' ? (
                  <p className="mt-2 text-xs text-teal-800/90">
                    Handed off to your SMTP server. Check the recipient inbox (and spam).
                  </p>
                ) : null}
                {emailSuccess.delivery === 'ethereal' && emailSuccess.previewUrl ? (
                  <div className="mt-3 space-y-2 text-xs text-teal-800/90">
                    <p>
                      Dev mode uses Ethereal: mail never goes to a real inbox. Open the preview link to see the full
                      message.
                    </p>
                    <a
                      href={emailSuccess.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex font-semibold text-teal-700 underline hover:text-teal-900"
                    >
                      Open email preview (new tab)
                    </a>
                  </div>
                ) : null}
                {emailSuccess.delivery === 'ethereal' && !emailSuccess.previewUrl ? (
                  <p className="mt-2 text-xs text-teal-800/90">
                    Ethereal did not return a preview URL — check the API terminal for details.
                  </p>
                ) : null}
                {emailSuccess.delivery === 'console' ? (
                  <p className="mt-2 text-xs text-teal-800/90">
                    Console-only mode (<code className="rounded bg-teal-100/80 px-1">MAIL_CONSOLE_ONLY=1</code>) or
                    Ethereal unreachable — see the API server terminal for the message text.
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeEmailModal}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Default address loads from the patient record; change <strong>Send to</strong> for class demos.
                With no SMTP in <code className="rounded bg-slate-100 px-1">.env</code>, the API uses Ethereal (fake
                inbox + preview link after send).
              </p>
              {emailErr && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{emailErr}</div>
              )}
              <label htmlFor="doctor-email-to" className="mt-3 block text-xs font-medium text-slate-700">
                Send to
              </label>
              <input
                id="doctor-email-to"
                type="email"
                autoComplete="email"
                placeholder="patient@example.com"
                title="Recipient email address"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
              {!emailToValid && (
                <p className="mt-1 text-xs text-red-600">Enter a valid email or clear the field to use the patient record.</p>
              )}
              <label htmlFor="doctor-email-subject" className="mt-3 block text-xs font-medium text-slate-700">
                Subject
              </label>
              <input
                id="doctor-email-subject"
                type="text"
                placeholder="Subject line"
                title="Email subject"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
              <label htmlFor="doctor-email-body" className="mt-3 block text-xs font-medium text-slate-700">
                Message
              </label>
              <textarea
                id="doctor-email-body"
                placeholder="Write your message…"
                title="Email body"
                className="mt-1 min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEmailModal}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={emailSending || !emailSubject.trim() || !emailBody.trim() || !emailToValid}
                  onClick={handleSendEmail}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

