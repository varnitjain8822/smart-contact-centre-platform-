// npm run seed — force-upserts help articles by slug (idempotent).
import mongoose from 'mongoose';
import { cfg } from '../config.js';
import { KbArticle } from '../models/KbArticle.js';
import { KbTranslation } from '../models/KbTranslation.js';
import { upsertArticles } from './kb.js';
import { KbChunk } from '../models/KbChunk.js';
import { reindex } from '../kb/vectors.js';
import { migrateTenancy } from '../lib/company.js';

await mongoose.connect(cfg.MONGO_URL);
await migrateTenancy();
await KbArticle.syncIndexes();
await KbTranslation.syncIndexes();
console.log(`seeded ${await upsertArticles()} articles`);
await KbChunk.syncIndexes();
console.log(`embedded ${await reindex()} changed articles/translations`);
await mongoose.disconnect();
