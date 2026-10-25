import nodemailer from 'nodemailer';
import { cfg } from '../config.js';
import { log } from '../lib/log.js';

let transport;

export function getTransport() {
  if (transport) return transport;

  if (cfg.SMTP_HOST) {
    transport = nodemailer.createTransport({
      host: cfg.SMTP_HOST,
      port: cfg.SMTP_PORT || 587,
      secure: cfg.SMTP_SECURE || cfg.SMTP_PORT === 465,
      auth: (cfg.SMTP_USER && cfg.SMTP_PASS) ? {
        user: cfg.SMTP_USER,
        pass: cfg.SMTP_PASS,
      } : undefined,
    });
    return transport;
  }

  transport = nodemailer.createTransport(cfg.SMTP_URL || 'smtp://mailhog:1025');
  return transport;
}

/** {to, subject, text, headers} → SMTP (mailhog or real SMTP). */
export const send = async (msg) => {
  const t = getTransport();
  try {
    const info = await t.sendMail({ from: cfg.MAIL_FROM, ...msg });
    log.info({ evt: 'email_sent', to: msg.to, subject: msg.subject, messageId: info.messageId });
    return info;
  } catch (err) {
    log.error({ evt: 'email_send_failed', to: msg.to, err: err.message });
    throw err;
  }
};
