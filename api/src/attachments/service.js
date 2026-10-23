import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { cfg } from '../config.js';
import { deps } from '../deps.js';
import { AppError } from '../lib/errors.js';
import { log } from '../lib/log.js';
import { Attachment } from '../models/Attachment.js';
import { Message } from '../models/Message.js';

export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_PER_MESSAGE = 5;
const CUSTOMER_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);
const abs = (rel) => join(cfg.UPLOAD_DIR, rel);

export const ref = (a) => ({ id: a._id, name: a.name, size: a.size, mime: a.mime });

function isUtf8Text(buf) {
  if (buf.includes(0)) return false;
  try { new TextDecoder('utf-8', { fatal: true }).decode(buf); return true; } catch { return false; }
}

/** Magic-byte check. png/jpg/webp/pdf by signature; txt (no signature) only as a .txt name holding valid UTF-8. */
export async function sniff(buf, name) {
  const ft = await fileTypeFromBuffer(buf);
  if (ft) return CUSTOMER_TYPES.has(ft.mime) ? ft.mime : null;
  return /\.txt$/i.test(name) && isUtf8Text(buf) ? 'text/plain' : null;
}

export const cleanName = (n) => basename(String(n ?? '')).replace(/[\u0000-\u001f\u007f"\\/]/g, '').trim().slice(0, 200) || 'file';

async function writeStored(dir, buffer) {
  const rel = join(dir, randomUUID());
  await mkdir(dirname(abs(rel)), { recursive: true });
  await writeFile(abs(rel), buffer, { flag: 'wx' });
  return rel;
}

/** Customer upload. ticket = null → kept under pending/ until a new ticket claims it. */
export async function storeUpload(userId, ticket, file) {
  if (!file?.buffer?.length) throw new AppError(400, 'VALIDATION_FAILED', 'Choose a file to upload');
  const name = cleanName(file.originalname);
  const mime = await sniff(file.buffer, name);
  if (!mime) throw new AppError(415, 'UNSUPPORTED_FILE_TYPE', 'Only PNG, JPG, WebP, PDF or TXT files are allowed');
  const path = await writeStored(ticket ? String(ticket._id) : 'pending', file.buffer);
  return Attachment.create({ userId, ticketId: ticket?._id ?? null, source: 'customer', name, size: file.buffer.length, mime, path });
}

/** Validate attachmentIds a customer wants to send on `ticket` (null = new ticket). Returns the docs, in request order. */
export async function claimable(userId, ids = [], ticket = null) {
  if (!ids.length) return [];
  const docs = await Attachment.find({ _id: { $in: ids }, userId, source: 'customer', messageId: null,
    ticketId: ticket ? { $in: [null, ticket._id] } : null });
  if (docs.length !== new Set(ids.map(String)).size) throw new AppError(400, 'INVALID_ATTACHMENT', 'One or more attachments are missing or already sent');
  return ids.map((id) => docs.find((d) => String(d._id) === String(id)));
}

/** Bind claimed attachments to their message; files uploaded before the ticket existed move into <ticketId>/. */
export async function link(docs, ticket, message) {
  for (const d of docs) {
    const set = { messageId: message._id, ticketId: ticket._id };
    if (!d.ticketId) {
      set.path = join(String(ticket._id), basename(d.path));
      await mkdir(dirname(abs(set.path)), { recursive: true });
      await rename(abs(d.path), abs(set.path));
    }
    await Attachment.updateOne({ _id: d._id, messageId: null }, { $set: set });
  }
}

/** Files to send to Chatwoot for a message. */
export async function filesFor(msg) {
  const docs = await Attachment.find({ messageId: msg._id }).sort({ createdAt: 1 });
  return Promise.all(docs.map(async (d) => ({ name: d.name, mime: d.mime, buffer: await readFile(abs(d.path)) })));
}

const nameFromUrl = (u, fallback) => {
  try { return cleanName(decodeURIComponent(new URL(u).pathname.split('/').pop())); } catch { return fallback; }
};

/** Download an agent's Chatwoot attachments into storage and attach them to the stored message. Failures are logged and skipped. */
export async function ingestAgentAttachments(ticket, message, cwAttachments = []) {
  const refs = [];
  for (const a of cwAttachments.filter((x) => x?.data_url).slice(0, 15)) {
    try {
      if (a.id != null && await Attachment.exists({ chatwootAttachmentId: a.id })) continue;
      const { buffer } = await deps.chatwoot.downloadAttachment(a.data_url, MAX_BYTES);
      const ft = await fileTypeFromBuffer(buffer);
      const mime = ft?.mime ?? (isUtf8Text(buffer) ? 'text/plain' : 'application/octet-stream');
      const path = await writeStored(String(ticket._id), buffer);
      const doc = await Attachment.create({ userId: ticket.customerId, ticketId: ticket._id, messageId: message._id, source: 'agent',
        name: nameFromUrl(a.data_url, `attachment-${a.id}${a.extension ? `.${a.extension}` : ''}`), size: buffer.length, mime, path,
        chatwootAttachmentId: a.id ?? null });
      refs.push(ref(doc));
    } catch (e) {
      log.warn({ evt: 'attachment_ingest_failed', ticket: ticket.number, chatwootAttachmentId: a.id, err: e.message });
    }
  }
  if (!refs.length) return message;
  return Message.findByIdAndUpdate(message._id, { $push: { attachments: { $each: refs } } }, { new: true, timestamps: false });
}

export async function getForOwner(userId, id) {
  const a = /^[a-f0-9]{24}$/.test(id) ? await Attachment.findOne({ _id: id, userId }) : null;
  if (!a) throw new AppError(404, 'NOT_FOUND', 'Attachment not found');
  return a;
}

/** Remove customer uploads never sent within 24 h (abandoned new-ticket forms). */
export async function sweepOrphans(now = new Date()) {
  const old = await Attachment.find({ messageId: null, source: 'customer', createdAt: { $lt: new Date(now - 86400_000) } }).limit(100);
  for (const a of old) {
    await rm(abs(a.path), { force: true });
    await Attachment.deleteOne({ _id: a._id, messageId: null });
  }
  return old.length;
}
