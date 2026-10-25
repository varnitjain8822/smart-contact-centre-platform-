import { Router } from 'express';
import multer from 'multer';
import { optionalUser } from '../auth/session.js';
import { deps } from '../deps.js';
import { AppError } from '../lib/errors.js';
import { limit } from '../lib/limit.js';

export const MAX_AUDIO_BYTES = 6 * 1024 * 1024;   // 6 MB (~30 s uncompressed, minutes of compressed audio)
export const ALLOWED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1, fields: 5 },
}).single('file');

export const uploadAudio = (req, res, next) => upload(req, res, (e) => {
  if (!e) return next();
  if (e.code === 'LIMIT_FILE_SIZE') {
    return next(new AppError(413, 'FILE_TOO_LARGE', 'Audio must be 30 seconds or less (under 6 MB)'));
  }
  return next(new AppError(400, 'VALIDATION_FAILED', e.code === 'LIMIT_UNEXPECTED_FILE' ? 'Upload audio in the "file" field' : 'Invalid upload'));
});

export const voiceRouter = Router();

// Rate limit: 30 voice transcribes per minute per user or IP
voiceRouter.post('/transcribe', optionalUser, limit({
  windowMs: 60_000,
  max: 30,
  key: (req) => (req.user?._id ? String(req.user._id) : req.ip),
}), uploadAudio, async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer?.length) {
      throw new AppError(400, 'VALIDATION_FAILED', 'Audio file is required in "file" field');
    }
    const mime = (req.file.mimetype || '').toLowerCase();
    if (!ALLOWED_AUDIO_MIMES.has(mime) && !mime.startsWith('audio/')) {
      throw new AppError(400, 'UNSUPPORTED_MEDIA_TYPE', 'Supported formats: webm, wav, mp3, ogg, m4a');
    }

    const lang = req.body?.language || req.query?.language || undefined;
    const result = await deps.groq.transcribe(req.file.buffer, req.file.mimetype, { language: lang });
    res.json({ text: result.text ?? '' });
  } catch (err) {
    if (err.code === 'not_configured') {
      return next(new AppError(503, 'NOT_CONFIGURED', 'Voice transcription is not configured'));
    }
    if (err.code === 'http_400' && (err.message?.includes('audio_too_short') || err.message?.includes('too short'))) {
      return res.json({ text: '' });
    }
    next(err);
  }
});
