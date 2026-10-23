import { Router } from 'express';
import { requireUser } from '../auth/session.js';
import * as hub from './hub.js';

export const streamRouter = Router();

streamRouter.get('/', requireUser, (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  req.socket.setTimeout(0);
  res.write('retry: 3000\n\n');
  const uid = String(req.user._id);
  hub.add(uid, res);
  req.on('close', () => hub.remove(uid, res));
});
