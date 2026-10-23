import mongoose from 'mongoose';

export const Counter = mongoose.model('Counter', new mongoose.Schema({ _id: String, seq: Number }, { versionKey: false }));

export async function nextTicketNumber() {
  const c = await Counter.findOneAndUpdate({ _id: 'ticket' }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `SC-${1000 + c.seq}`;
}
