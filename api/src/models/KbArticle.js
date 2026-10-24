import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  slug: { type: String, required: true },
  locale: { type: String, enum: ['en'], default: 'en' },   // source locale; other locales live in KbTranslation
  title: { type: String, required: true, minlength: 5, maxlength: 140 },
  category: { type: String, required: true },   // a key of the company's categories
  body: { type: String, required: true },
  keywords: [String],
  views: { type: Number, default: 0 },
}, { timestamps: true });

schema.index({ companyId: 1, slug: 1 }, { unique: true });
// companyId prefix: every $text query must name the company (tenancy is enforced by the index itself)
schema.index({ companyId: 1, title: 'text', keywords: 'text', body: 'text' }, { weights: { title: 10, keywords: 5, body: 1 }, name: 'kb_text_company' });
schema.index({ companyId: 1, category: 1, title: 1 });
schema.index({ companyId: 1, views: -1 });

export const KbArticle = mongoose.model('KbArticle', schema);
