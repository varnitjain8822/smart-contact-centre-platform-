import mongoose from 'mongoose';

// One embedded passage of a KB article (locale 'en') or translation ('hi'). `hash` = model + chunk texts, so an edit or a
// model change re-embeds that article only. Vectors are unit length (cosine = dot product).
const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  slug: { type: String, required: true },
  locale: { type: String, enum: ['en', 'hi'], required: true },
  hash: { type: String, required: true },
  i: { type: Number, required: true },
  text: { type: String, required: true },
  vector: { type: [Number], required: true },
});

schema.index({ companyId: 1, slug: 1, locale: 1, i: 1 }, { unique: true });

export const KbChunk = mongoose.model('KbChunk', schema);
