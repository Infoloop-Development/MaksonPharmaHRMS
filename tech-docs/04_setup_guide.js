const fs = require('fs');
const path = require('path');
const { Document, Packer } = require('docx');
const S = require('./_shared.js');

const doc = new Document({
  styles: S.styles, numbering: S.numbering,
  sections: [{
    properties: { page: S.PAGE },
    headers: { default: S.buildHeader('Local Dev Setup Guide') },
    footers: { default: S.buildFooter() },
    children: [
      ...S.titleBlock('LOCAL DEV SETUP GUIDE', 'MAMS - Day 1 Onboarding for Engineers'),

      S.kvTable([
        ['Document', 'Local Dev Setup Guide'],
        ['Project', 'Makson Attendance Management System (MAMS)'],
        ['Audience', 'New engineers joining the MAMS team'],
        ['Goal', 'Working local environment in under 30 minutes'],
        ['Owner', 'Tech Lead, Infoloop Technologies LLP'],
        ['Version', 'v1 - 30 April 2026'],
      ]),
      S.spacer(280),

      S.mockupCallout(),
      S.spacer(280),

      S.h2('1. WHAT YOU WILL HAVE AT THE END OF THIS GUIDE'),
      S.bullet('Local clone of the mams monorepo.'),
      S.bullet('Local MongoDB running with seed data (1,800 mock employees, 1 week of attendance).'),
      S.bullet('mams-server running on http://localhost:3001 with hot reload.'),
      S.bullet('mams-web running on http://localhost:5173 with hot reload.'),
      S.bullet('Device simulator pushing fake punches every minute.'),
      S.bullet('Working login as hr.admin and hr.compliance.'),

      S.h2('2. PREREQUISITES'),
      S.dataTable(
        ['Tool', 'Minimum version', 'How to verify'],
        [
          ['Node.js', '20.0.0', 'node --version'],
          ['npm', '10.0.0', 'npm --version'],
          ['Git', '2.30+', 'git --version'],
          ['MongoDB', '7.0+ (local install OR Docker)', 'mongod --version OR docker --version'],
          ['VS Code (recommended)', 'latest', 'code --version'],
        ],
        [3000, 3000, 4080]
      ),
      S.p('Install Node.js via nvm (recommended) so you can match the project’s .nvmrc version exactly:'),
      S.codeBlock(`# Install nvm (one-time)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Then in the project directory:
nvm install
nvm use
node --version  # should print the version in .nvmrc`),

      S.h2('3. INSTALL MONGODB LOCALLY'),
      S.h3('3.1 Option A: Native install (macOS)'),
      S.codeBlock(`brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
# Verify:
mongosh --eval "db.runCommand({ ping: 1 })"`),

      S.h3('3.2 Option B: Native install (Ubuntu / Debian)'),
      S.codeBlock(`# Add MongoDB repo
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
mongosh --eval "db.runCommand({ ping: 1 })"`),

      S.h3('3.3 Option C: Docker (any OS)'),
      S.codeBlock(`docker run -d --name mams-mongo \\
  -p 27017:27017 \\
  -v mams-mongo-data:/data/db \\
  mongo:7

# Verify:
docker exec -it mams-mongo mongosh --eval "db.runCommand({ ping: 1 })"`),

      S.h2('4. CLONE AND INSTALL'),
      S.codeBlock(`# Clone (replace with actual repo URL once available)
git clone git@github.com:infoloop/mams.git
cd mams

# The repo is a monorepo. Install all workspaces in one shot:
npm install

# Folder layout:
#   mams-server/        Express + Mongoose + TS
#   mams-web/           Vite + React + TS + Tailwind
#   shared/types/       Zod schemas (single source of truth for shapes)
#   ops/                nginx config, pm2 ecosystem, deploy scripts
#   docs/               markdown docs (this guide, dev scope, etc.)
#   tech-docs/          DOCX/PDF generators (this folder)
#   scripts/            seed scripts, eSSL simulator, dev utilities`),

      S.h2('5. ENVIRONMENT VARIABLES'),
      S.p('Copy the example env file and fill in local values. Never commit .env to git.'),
      S.codeBlock(`cp mams-server/.env.example mams-server/.env
cp mams-web/.env.example mams-web/.env`),
      S.h3('5.1 mams-server/.env'),
      S.codeBlock(`NODE_ENV=development
PORT=3001
MONGO_URI=mongodb://localhost:27017/mams_dev
JWT_ACCESS_SECRET=replace-me-with-32-bytes-random
JWT_REFRESH_SECRET=replace-me-with-32-bytes-random
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
LOG_LEVEL=debug
TZ=Asia/Kolkata
ESSL_PUSH_PATH=/iclock/cdata        # do not change unless protocol changes
SMART_ANCHOR_VERSION=v2.0.0
SEED_ON_BOOT=false                  # set true ONLY for first-time seed
`),
      S.p('Generate the JWT secrets with: openssl rand -base64 32'),

      S.h3('5.2 mams-web/.env'),
      S.codeBlock(`VITE_API_BASE_URL=http://localhost:3001
VITE_DEMO_MODE=true                 # enables the dev-only demo banner
`),

      S.h2('6. SEED THE DATABASE'),
      S.p('Run the seed script. It creates two seed users, one settings doc, 1,800 mock employees with weighted department distribution, and seven days of mock attendance using the same generator pattern as the approved mockup.'),
      S.codeBlock(`cd mams-server
npm run seed

# Expected output:
# [seed] Connected to mongodb://localhost:27017/mams_dev
# [seed] Created seed users: hr.admin@makson-group.com, hr.compliance@makson-group.com
# [seed] Created settings singleton
# [seed] Created 1800 employees
# [seed] Created 12,847 attendance_raw records (7 days)
# [seed] Computed 12,600 attendance_derived records via Smart Anchor v2
# [seed] Done.`),
      S.p('Login credentials after seeding:'),
      S.kvTable([
        ['HR Admin (real view)', 'hr.admin@makson-group.com / makson2026'],
        ['Compliance Auditor (8-hour view)', 'hr.compliance@makson-group.com / makson2026'],
      ]),

      S.h2('7. RUN THE DEV SERVERS'),
      S.p('In one terminal:'),
      S.codeBlock(`cd mams-server
npm run dev          # tsx watch on src/index.ts -> http://localhost:3001`),
      S.p('In another terminal:'),
      S.codeBlock(`cd mams-web
npm run dev          # Vite dev server -> http://localhost:5173`),
      S.p('Open http://localhost:5173 in your browser. You should see the login screen. Sign in as hr.admin to see the real view, or as hr.compliance to see the compliant view.'),

      S.h2('8. RUN THE eSSL DEVICE SIMULATOR'),
      S.p('To exercise the attendance ingestion path without a physical eSSL device, run the simulator. It pushes a batch of fake punches every minute.'),
      S.codeBlock(`# In a third terminal:
cd scripts
node essl-sim.js

# Expected output every minute:
# [essl-sim] Pushed 3 punches at 2026-04-29T09:14:23+05:30
# [essl-sim] Server response: OK`),
      S.p('The simulator picks 3 random employees from the seed and submits IN punches every minute. Watch the live attendance log in the UI to see them arrive in real time.'),

      S.h2('9. RUN THE TEST SUITE'),
      S.codeBlock(`# Server tests (Vitest + Supertest)
cd mams-server
npm test                # one-off run
npm run test:watch      # watch mode

# Web tests
cd mams-web
npm test
npm run test:watch

# Type check (no emit)
npm run typecheck

# Lint
npm run lint

# All gates - run before committing
npm run validate        # at repo root: typecheck + lint + test`),
      S.p('The Smart Anchor v2 engine has its own deterministic test suite at mams-server/src/smart-anchor/__tests__/. Every change to the engine MUST keep these tests green - they are the contract.'),

      S.h2('10. EDITOR SETUP'),
      S.p('Recommended VS Code extensions (the repo has .vscode/extensions.json that auto-suggests these):'),
      S.bullet('ESLint (dbaeumer.vscode-eslint)'),
      S.bullet('Prettier (esbenp.prettier-vscode)'),
      S.bullet('Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)'),
      S.bullet('MongoDB for VS Code (mongodb.mongodb-vscode)'),
      S.bullet('Error Lens (usernamehw.errorlens) - shows TS errors inline'),
      S.bullet('GitLens (eamodio.gitlens) - blame and history inline'),
      S.p('Default formatting: format-on-save is enabled in the workspace settings. Do not turn it off in your user settings; PR diffs become unreadable when half the team formats and half does not.'),

      S.h2('11. COMMON ISSUES'),
      S.dataTable(
        ['Symptom', 'Likely cause', 'Fix'],
        [
          ['MongoServerError: connect ECONNREFUSED 127.0.0.1:27017', 'MongoDB not running', 'brew services start mongodb-community@7.0 OR docker start mams-mongo'],
          ['Seed script: "Cannot find module ../shared/types"', 'Workspaces not built yet', 'Run npm install at repo root, not inside a workspace'],
          ['CORS error in browser console', 'mams-server CORS_ORIGIN does not match mams-web URL', 'Set CORS_ORIGIN=http://localhost:5173 in mams-server/.env'],
          ['Login returns 401 with valid creds', 'Seed not run, or different DB', 'Verify MONGO_URI matches; re-run npm run seed'],
          ['eSSL simulator returns 404', 'Simulator serial not registered in devices collection', 'Insert a devices record with serialNumber: "SIM0000001" or use seed:devices script'],
          ['Tailwind classes not applying', 'Vite cache stale after content paths changed', 'rm -rf mams-web/node_modules/.vite and restart dev server'],
          ['Time off by 5h30m', 'TZ env var not set OR forgot fromZonedTime', 'Set TZ=Asia/Kolkata; always use date-fns-tz, never raw Date.toLocaleString'],
          ['"any" type sneaking in', 'TypeScript strict mode disabled accidentally', 'tsc --noEmit must pass with strict in tsconfig.json'],
        ],
        [3500, 3500, 3080]
      ),

      S.h2('12. WORKING WITH THE SHARED TYPES PACKAGE'),
      S.p('shared/types/ contains Zod schemas that are the single source of truth for API contracts. The pattern:'),
      S.codeBlock(`// shared/types/employee.ts
import { z } from 'zod';

export const EmployeeSchema = z.object({
  empCode: z.string().regex(/^MKS\\d{4}$/),
  name: z.string().min(1),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/),
  // ...
});

export type Employee = z.infer<typeof EmployeeSchema>;

// mams-server uses it for validation:
import { EmployeeSchema } from '@mams/types';
const validated = EmployeeSchema.parse(req.body);

// mams-web uses the inferred TS type:
import { Employee } from '@mams/types';
function EmployeeRow({ employee }: { employee: Employee }) { ... }`),
      S.p('Whenever you change a field on the server side, change it in shared/types/ first. The types and the validation will then be consistent across the boundary.'),

      S.h2('13. GIT WORKFLOW'),
      S.bullet('Branch from main: git checkout -b feat/<module>-<short-desc>'),
      S.bullet('Commit using Conventional Commits: feat:, fix:, docs:, refactor:, test:, chore:.'),
      S.bullet('Open a PR. CI runs lint + typecheck + test on every push.'),
      S.bullet('At least one reviewer required before merge. Squash-merge to keep main history clean.'),
      S.bullet('Never force-push to main. Never skip CI.'),

      S.h2('14. WHEN YOU GET STUCK'),
      S.bullet('Read CLAUDE.md at repo root - covers project context, house rules, and decisions already made.'),
      S.bullet('Read docs/development-scope.md - the team-facing scope doc.'),
      S.bullet('Read this folder’s sibling DOCX/PDF tech docs: SAD, DB Schema Reference, eSSL ADMS Cheat-sheet.'),
      S.bullet('The approved mockup at https://makson-payroll-mockup.netlify.app shows the intended UX for every screen.'),
      S.bullet('Ask the tech lead in #mams-dev. Do not ask the Client.'),
      S.bullet('If you find a contradiction between two docs, flag it; document drift is a defect.'),

      S.h2('15. WHAT TO BUILD ON DAY 1'),
      S.p('After this guide is working, your first task assignments will come from the tech lead based on the sprint plan in docs/development-scope.md. A typical Day 1 ticket: pick a small fix or extension to one of the seed scripts or the device simulator. Get a PR open, get it reviewed, get it merged. The fastest way to learn the codebase is to ship something small in week 1.'),

      S.spacer(280),
      S.callout(
        'WELCOME TO THE TEAM',
        'If you have read this far and your local environment works, you are ready to start. The fastest engineers on this project are the ones who read CLAUDE.md and the SAD before writing any code, and who treat documentation as part of the deliverable from day one. Welcome aboard.',
        S.COLORS.accentDark
      ),

      S.h2('16. RELATED DOCUMENTS'),
      S.bullet('System Architecture Document - architecture and key technical decisions.'),
      S.bullet('Database Schema Reference - field-by-field collection spec.'),
      S.bullet('eSSL ADMS Protocol Cheat-sheet - device integration spec.'),
      S.bullet('Development Scope of Work - team-facing functional and process scope.'),
      S.bullet('Approved mockup - https://makson-payroll-mockup.netlify.app'),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'tech', '04_Local_Dev_Setup_Guide.docx'), buf);
  console.log('Setup Guide created');
});
