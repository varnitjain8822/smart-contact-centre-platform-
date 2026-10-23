import { Router } from 'express';
import multer from 'multer';
import { requireUser } from '../auth/session.js';
import { cfg } from '../config.js';
import { AppError } from '../lib/errors.js';
import { limit } from '../lib/limit.js';
import { toAttachment } from '../tickets/dto.js';
import * as svc from './service.js';

const single = multer({ storage: multer.memoryStorage(), limits: { fileSize: svc.MAX_BYTES, files: 1, fields: 5 } }).single('file');
/** multipart field `file` → req.file (buffer). Errors mapped to the API error format. */
export const uploadFile = (req, res, next) => single(req, res, (e) => {
  if (!e) return next();
  if (e.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'FILE_TOO_LARGE', 'Files must be 10 MB or smaller'));
  return next(new AppError(400, 'VALIDATION_FAILED', e.code === 'LIMIT_UNEXPECTED_FILE' ? 'Upload one file in the "file" field' : 'Invalid upload'));
});

export const attachmentsRouter = Router();
attachmentsRouter.use(requireUser);

// Upload before the ticket exists (New ticket form); pass the id in attachmentIds on POST /api/tickets.
attachmentsRouter.post('/', limit({ windowMs: 60_000, max: 30, key: (req) => String(req.user._id) }), uploadFile, async (req, res) => {
  res.status(201).json({ attachment: toAttachment(await svc.storeUpload(req.user._id, null, req.file)) });
});

const INLINE = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
attachmentsRouter.get('/:id', async (req, res) => {
  const a = await svc.getForOwner(req.user._id, String(req.params.id));
  res.set({ 'Cache-Control': 'private, max-age=3600', 'Content-Security-Policy': "default-src 'none'; sandbox" });
  res.attachment(a.name);   // sets a safe RFC 5987 filename
  if (INLINE.has(a.mime)) res.set('Content-Disposition', res.get('Content-Disposition').replace(/^attachment/, 'inline'));
  res.type(a.mime).sendFile(a.path, { root: cfg.UPLOAD_DIR, dotfiles: 'deny', headers: { 'Content-Type': a.mime } });
});
