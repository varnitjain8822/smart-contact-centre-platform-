import mongoose from 'mongoose';

// Fabricated customer record a company's AI tools can read (ai/tools.js). customerId null = public (e.g. flight status).
const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  collection: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  data: { type: Object, required: true },
  mock: { type: Boolean, default: true },
}, { suppressReservedKeysWarning: true, versionKey: false });

schema.index({ companyId: 1, collection: 1, customerId: 1 });

export const MockRecord = mongoose.model('MockRecord', schema);
