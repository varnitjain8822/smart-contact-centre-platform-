import { Router } from 'express';
import { Company } from '../models/Company.js';
import { AppError } from '../lib/errors.js';
import { companyBySlug, defaultCompany, toCompany } from '../lib/company.js';

// Public: the portal picker (`/`) and each portal's branding/topics (`/c/:slug`).
export const companiesRouter = Router();

companiesRouter.get('/', async (req, res) => {
  await defaultCompany();
  const all = await Company.find({}).sort({ demo: 1, name: 1 }).lean();
  res.json({ items: all.map(toCompany) });
});

companiesRouter.get('/:slug', async (req, res) => {
  const c = await companyBySlug(String(req.params.slug).toLowerCase());
  if (!c) throw new AppError(404, 'COMPANY_NOT_FOUND', 'Unknown company');
  res.json({ company: toCompany(c) });
});
