import mongoose from 'mongoose';

// A translated article (own collection: MongoDB allows one text index per collection and kb_text stays English).
const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  slug: { type: String, required: true },
  locale: { type: String, enum: ['hi'], required: true },
  title: { type: String, required: true, minlength: 5, maxlength: 140 },
  body: { type: String, required: true },
  keywords: [String],
}, { timestamps: true });

schema.index({ companyId: 1, slug: 1, locale: 1 }, { unique: true });
schema.index({ companyId: 1, title: 'text', keywords: 'text', body: 'text' }, { weights: { title: 10, keywords: 5, body: 1 }, name: 'kb_tr_text_company', default_language: 'none' });

export const KbTranslation = mongoose.model('KbTranslation', schema);
