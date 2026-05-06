import cron from 'node-cron';
import { Op } from 'sequelize';
import sequelize from '../db/sequelize';
import { Patient, Prescription } from '../models';
import { sendMail } from '../services/mail';

function yesterdayYmd(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Daily reminder: patients with at least one active Rx who logged zero doses yesterday.
 */
async function runReminderPass(): Promise<void> {
  const y = yesterdayYmd();
  const today = new Date().toISOString().slice(0, 10);

  const activeRx = await Prescription.findAll({
    where: {
      StartDate: { [Op.lte]: today },
      [Op.or]: [{ EndDate: null }, { EndDate: { [Op.gte]: today } }],
    },
    attributes: ['PatientID', 'PrescriptionID'],
  });

  const byPatient = new Map<number, number[]>();
  for (const row of activeRx) {
    const p = (row as Prescription).PatientID;
    const id = (row as Prescription).PrescriptionID;
    if (!byPatient.has(p)) byPatient.set(p, []);
    byPatient.get(p)!.push(id);
  }

  for (const [patientId, rxIds] of byPatient) {
    if (rxIds.length === 0) continue;
    const ph = rxIds.map(() => '?').join(', ');
    const [cntRows] = await sequelize.query(
      `
      SELECT COUNT(*) AS c
      FROM Dose_Logs dl
      WHERE dl.PrescriptionID IN (${ph})
        AND DATE(dl.TimeTaken) = ?
      `,
      { replacements: [...rxIds, y] },
    );
    const n = Number((cntRows as { c: number }[])[0]?.c ?? 0);
    if (n > 0) continue;

    const patient = await Patient.findByPk(patientId);
    if (!patient) continue;

    await sendMail({
      to: patient.Email,
      subject: 'Medication Tracker — gentle adherence reminder',
      text:
        `Hello ${patient.FirstName},\n\n` +
        `Our records show no dose logs for ${y}. If you missed logging or doses, ` +
        `please open Medication Tracker and update your schedule.\n\n` +
        `This is an automated educational message — not medical advice.\n`,
    });
  }
}

export function startAdherenceReminderJob(): void {
  if (process.env.ADHERENCE_REMINDER_CRON === '0') {
    console.log('Adherence reminder cron disabled (ADHERENCE_REMINDER_CRON=0)');
    return;
  }
  cron.schedule('40 8 * * *', () => {
    runReminderPass().catch((e) => console.error('adherence reminder job failed', e));
  });
  console.log('Adherence reminder cron scheduled (daily 08:40 server local time)');
}
