import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM ?? 'medication-tracker@localhost';

/** When SMTP credentials are missing, skip Ethereal and only print to stdout (legacy demo mode). */
const MAIL_CONSOLE_ONLY = process.env.MAIL_CONSOLE_ONLY === '1';

let productionTransport: nodemailer.Transporter | null = null;
let etherealTransport: nodemailer.Transporter | null = null;

export type SendMailParams = { to: string; subject: string; text: string };

export type SendMailResult = {
  ok: true;
  /** smtp = your SMTP; ethereal = auto test inbox (preview URL); console = logged only */
  mode: 'smtp' | 'ethereal' | 'console';
  previewUrl?: string;
};

function getProductionTransport(): nodemailer.Transporter | null {
  if (productionTransport) return productionTransport;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  productionTransport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return productionTransport;
}

async function getEtherealTransport(): Promise<nodemailer.Transporter> {
  if (etherealTransport) return etherealTransport;
  const testAccount = await nodemailer.createTestAccount();
  console.log(
    '[mail] Ethereal test SMTP enabled — messages are not delivered to real addresses; use preview URLs to view.',
  );
  etherealTransport = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  return etherealTransport;
}

function logConsoleFallback(params: SendMailParams): void {
  console.log('[mail:console]', {
    to: params.to,
    subject: params.subject,
    preview: params.text.slice(0, 200),
  });
}

export async function sendMail(params: SendMailParams): Promise<SendMailResult> {
  const prod = getProductionTransport();
  if (prod) {
    await prod.sendMail({
      from: MAIL_FROM,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    return { ok: true, mode: 'smtp' };
  }

  if (MAIL_CONSOLE_ONLY) {
    logConsoleFallback(params);
    return { ok: true, mode: 'console' };
  }

  try {
    const tx = await getEtherealTransport();
    const info = await tx.sendMail({
      from: `"Medication Tracker (dev)" <${MAIL_FROM}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    const rawPreview = nodemailer.getTestMessageUrl(info);
    const previewUrl = typeof rawPreview === 'string' ? rawPreview : undefined;
    if (previewUrl) {
      console.log('[mail:ethereal] Preview:', previewUrl);
    }
    return { ok: true, mode: 'ethereal', previewUrl };
  } catch (err) {
    console.error('[mail] Ethereal send failed (offline?), using console fallback:', err);
    logConsoleFallback(params);
    return { ok: true, mode: 'console' };
  }
}
