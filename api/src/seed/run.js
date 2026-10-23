// npm run seed — force-upserts help articles by slug (idempotent).
import mongoose from 'mongoose';
import { cfg } from '../config.js';
import { KbArticle } from '../models/KbArticle.js';
import { KbTranslation } from '../models/KbTranslation.js';
import { upsertArticles } from './kb.js';

await mongoose.connect(cfg.MONGO_URL);
await KbArticle.syncIndexes();
await KbTranslation.syncIndexes();
console.log(`seeded ${await upsertArticles()} articles`);
await mongoose.disconnect();
