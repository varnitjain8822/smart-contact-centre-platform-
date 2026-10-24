// npm run seed:companies [-- slug …] | -- --remove slug … — loads api/seed/companies/*/ (lld-backend §14). Idempotent. Needs the api env (MONGO_URL …):
//   docker compose exec api npm run seed:companies
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { cfg } from '../config.js';
import { migrateTenancy } from '../lib/company.js';
import { loadCompanies } from './companies.js';
import { Company } from '../models/Company.js';
import { Message } from '../models/Message.js';
import { Ticket } from '../models/Ticket.js';
import '../models/Notification.js';
import '../models/Feedback.js';

const root = process.env.COMPANIES_DIR ?? fileURLToPath(new URL('../../seed/companies', import.meta.url));
await mongoose.connect(cfg.MONGO_URL);
await migrateTenancy();
await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
const args = process.argv.slice(2);
if (args[0] === '--remove') {
  // e2e cleanup (make e2e loads the acme fixture): the company and every document scoped to it
  for (const slug of args.slice(1).filter((s) => s !== 'smartcc')) {
    const c = await Company.findOne({ slug }).lean();
    if (!c) { console.log(`${slug}: not found`); continue; }
    const tickets = await Ticket.find({ companyId: c._id }, '_id').lean();
    await Message.deleteMany({ ticketId: { $in: tickets.map((t) => t._id) } });
    for (const name of ['Ticket', 'User', 'MockRecord', 'KbArticle', 'KbTranslation', 'KbChunk', 'Notification', 'KbVote', 'AssistantFeedback']) {
      await mongoose.model(name).deleteMany({ companyId: c._id });
    }
    await Company.deleteOne({ _id: c._id });
    console.log(`${slug}: removed`);
  }
} else {
  const r = await loadCompanies(root, { only: args.length ? args : undefined });
  console.log(`${r.filter((x) => x.ok).length} loaded, ${r.filter((x) => !x.ok).length} skipped (${root})`);
}
await mongoose.disconnect();
