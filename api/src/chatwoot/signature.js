import { createHmac, timingSafeEqual } from 'node:crypto';
import { cfg } from '../config.js';
import { AppError } from '../lib/errors.js';
import { log } from '../lib/log.js';
import { WebhookDelivery } from '../models/WebhookDelivery.js';

export function verifySignature(rawBody /* Buffer */, ts, sig, secret, nowS, toleranceS) {
  if (!ts || !sig || !sig.startsWith('sha256=')) throw new AppError(401, 'INVALID_SIGNATURE');
  if (!/^\d+$/.test(ts) || Math.abs(nowS - Number(ts)) > toleranceS) throw new AppError(401, 'STALE_WEBHOOK');
  const expected = createHmac('sha256', secret).update(`${ts}.`).update(rawBody).digest('hex');
  const a = Buffer.from(sig.slice(7), 'hex'), b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new AppError(401, 'INVALID_SIGNATURE');
}

// router.post(path, express.raw({type:'*/*', limit:'1mb'}), receive(secret, source, handler))
export const receive = (secret, source, handler) => async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  try {
    verifySignature(raw, req.get('x-chatwoot-timestamp'), req.get('x-chatwoot-signature'), secret,
      Math.floor(Date.now() / 1000), cfg.WEBHOOK_TOLERANCE_S);
  } catch (e) {
    log.warn({ evt: 'webhook_rejected', source, reason: e.code });
    throw e;
  }
  let payload;
  try { payload = JSON.parse(raw.toString('utf8')); } catch {
    log.warn({ evt: 'webhook_rejected', source, reason: 'invalid_json' });
    throw new AppError(400, 'VALIDATION_FAILED', 'Invalid JSON');
  }
  const deliveryId = req.get('x-chatwoot-delivery');
  if (deliveryId) {
    try { await WebhookDelivery.create({ _id: deliveryId, source, event: payload.event }); } catch (e) {
      if (e.code === 11000) return res.json({ ok: true, duplicate: true });
      throw e;
    }
  } else log.warn({ evt: 'webhook_no_delivery_id', source });
  res.json({ ok: true });
  setImmediate(() => Promise.resolve().then(() => handler(payload)).catch((e) => {
    log.error({ evt: 'webhook_handler_error', source, event: payload.event, err: e.message });
    // free the id so a resend is processed; otherwise reconcile-on-open (REQ-045) / bot sweep heal the lost event
    if (deliveryId) return WebhookDelivery.deleteOne({ _id: deliveryId }).catch(() => {});
  }));
};
