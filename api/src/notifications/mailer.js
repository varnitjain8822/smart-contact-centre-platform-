import nodemailer from 'nodemailer';
import { cfg } from '../config.js';

let transport;
/** {to, subject, text, headers} → SMTP (mailhog locally). Swapped for a fake in tests via createApp({mailer}). */
export const send = (msg) => (transport ??= nodemailer.createTransport(cfg.SMTP_URL)).sendMail({ from: cfg.MAIL_FROM, ...msg });
