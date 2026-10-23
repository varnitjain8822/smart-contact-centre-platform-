import mongoose from 'mongoose';

// One live sign-in code per identifier (`email:<addr>` | `phone:<E.164>`); a new request replaces it. Only an HMAC of the code is stored.
const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model('Otp', schema);
