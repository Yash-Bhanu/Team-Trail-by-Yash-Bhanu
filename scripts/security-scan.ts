// Static Security Self-Scan Script (run via `npm run security:scan`)
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

const FORBIDDEN_CLIENT_IMPORTS = ['server-only', 'src/server/', '@/server/'];
const DANGEROUS_PATTERNS = [
  { name: 'dangerouslySetInnerHTML', regex: /dangerouslySetInnerHTML/g },
  { name: 'eval()', regex: /\beval\s*\(/g },
  { name: 'wildcard-cors', regex: /Access-Control-Allow-Origin['":\s]+\*/g },
];

let issues = 0;

function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      const isClient = content.startsWith("'use client'") || content.startsWith('"use client"');

      if (isClient) {
        for (const forbidden of FORBIDDEN_CLIENT_IMPORTS) {
          if (content.includes(forbidden)) {
            console.error(`❌ Client component ${full} imports server module: ${forbidden}`);
            issues++;
          }
        }
      }

      for (const pat of DANGEROUS_PATTERNS) {
        if (pat.regex.test(content)) {
          console.error(`❌ Dangerous pattern ${pat.name} found in ${full}`);
          issues++;
        }
      }
    }
  }
}

walk(SRC_DIR);

if (issues > 0) {
  console.error(`\nSecurity scan failed with ${issues} issue(s).`);
  process.exit(1);
} else {
  console.log('✅ Static security scan passed: 0 issues found.');
}
