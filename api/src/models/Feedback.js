import mongoose from 'mongoose';

// One KB helpful vote per user per article (upserted).
const kbVote = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  slug: { type: String, required: true },
  helpful: { type: Boolean, required: true },
}, { timestamps: true });
kbVote.index({ userId: 1, slug: 1 }, { unique: true });
kbVote.index({ companyId: 1, slug: 1, helpful: 1 });
export const KbVote = mongoose.model('KbVote', kbVote);

// Assistant 👍/👎, kept for review. One per user per answer (sha256 of the answer text).
const assistantFeedback = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  hash: { type: String, required: true },
  excerpt: { type: String, required: true },
  question: String,
  helpful: { type: Boolean, required: true },
  sources: [{ _id: false, slug: String, title: String }],
  locale: String,
}, { timestamps: true });
assistantFeedback.index({ userId: 1, hash: 1 }, { unique: true });
assistantFeedback.index({ createdAt: -1 });
assistantFeedback.index({ companyId: 1, createdAt: -1 });
export const AssistantFeedback = mongoose.model('AssistantFeedback', assistantFeedback);
