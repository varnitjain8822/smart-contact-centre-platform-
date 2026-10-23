import mongoose from 'mongoose';
import { CATEGORIES } from '../constants.js';

const schema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  locale: { type: String, enum: ['en'], default: 'en' },   // source locale; other locales live in KbTranslation
  title: { type: String, required: true, minlength: 5, maxlength: 140 },
  category: { type: String, enum: CATEGORIES, required: true },
  body: { type: String, required: true },
  keywords: [String],
  views: { type: Number, default: 0 },
}, { timestamps: true });

schema.index({ title: 'text', keywords: 'text', body: 'text' }, { weights: { title: 10, keywords: 5, body: 1 }, name: 'kb_text' });
schema.index({ category: 1, title: 1 });
schema.index({ views: -1 });

export const KbArticle = mongoose.model('KbArticle', schema);
