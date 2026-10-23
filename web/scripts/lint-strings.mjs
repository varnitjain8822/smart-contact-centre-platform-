// Fails on user-facing text hard-coded in src/pages + src/features JSX, on t('key') calls whose key is missing,
// and on en/hi key drift. Run: npm run lint:strings
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const ALLOW = /^(SmartCC|SC-\d+|esc|[↑↓↵·—–&;:()/+\s\d]+)$/; // brand, sample ids, key glyphs, punctuation
const TEXT_PROPS = new Set(['aria-label', 'title', 'placeholder', 'alt', 'label', 'legend', 'desc', 'body', 'lede', 'text', 'hint', 'content']);
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');
const en = new Set(flat(JSON.parse(readFileSync('src/locales/en.json', 'utf8'))));
const hi = new Set(flat(JSON.parse(readFileSync('src/locales/hi.json', 'utf8'))));
const has = (set, k) => set.has(k) || set.has(`${k}_one`) || set.has(`${k}_other`);

const problems = [];
for (const k of en) if (!hi.has(k)) problems.push(`hi.json missing "${k}"`);
for (const k of hi) if (!en.has(k) && !has(en, base(k))) problems.push(`en.json missing "${k}"`);

const files = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) ? [p] : []; });
const jsxScope = (p) => /^src\/(pages|features)\//.test(p) && p.endsWith('.tsx');

for (const file of files('src')) {
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const at = (n) => `${file}:${src.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
  const visit = (n) => {
    if (jsxScope(file)) {
      if (ts.isJsxText(n)) {
        const s = n.text.replace(/\s+/g, ' ').trim();
        if (/\p{L}/u.test(s) && !ALLOW.test(s)) problems.push(`${at(n)} hard-coded text "${s}"`);
      }
      if (ts.isJsxAttribute(n) && TEXT_PROPS.has(n.name.getText()) && n.initializer && ts.isStringLiteral(n.initializer)
        && /\p{L}/u.test(n.initializer.text) && !ALLOW.test(n.initializer.text))
        problems.push(`${at(n)} hard-coded ${n.name.getText()}="${n.initializer.text}"`);
    }
    if (ts.isCallExpression(n) && /^(t|tr|i18n\.t)$/.test(n.expression.getText()) && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
      const k = n.arguments[0].text;
      if (!has(en, k)) problems.push(`${at(n)} unknown i18n key "${k}"`);
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
}

if (problems.length) { console.error(problems.join('\n') + `\n\n${problems.length} string problem(s)`); process.exit(1); }
console.log(`lint:strings ok (${en.size} keys)`);
