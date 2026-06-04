# MAMS Repo Templates

Three files to drop into the GitHub repos when they're created (planned: Mon 4 May 2026 by Nimit).

| File | Purpose | Where it goes |
|---|---|---|
| `CLAUDE.md` | Project context for Claude (used by Claude Code, Cursor's Claude integration). Encodes compliance constraints, coding rules, milestone gates. | Root of `mams-server`, `mams-web`, and `mams-shared` repos |
| `.cursorrules` | Cursor / GitHub Copilot project rules. Tells AI tools what patterns to avoid. | Root of `mams-server`, `mams-web`, and `mams-shared` repos |
| `.coderabbit.yaml` | CodeRabbit configuration with path-based rules. Auto-flags compliance-critical PRs for human review (no auto-approve). | Root of `mams-server`, `mams-web`, and `mams-shared` repos |

## Why pre-loading these matters

Without these files, AI tools (Cursor, Copilot, CodeRabbit) generate generic Express/React patterns that violate this project's compliance constraints — `console.log(employee)` debug lines that leak Aadhaar, `findOneAndUpdate` on biometric records, `Math.random()` in Smart Anchor code. Pre-loading the constraints means the FIRST suggestion from each tool is already on-track, instead of us catching violations at PR-review time.

The single highest-leverage prep task on the project. Nimit's task `[1-Infra] Add CLAUDE.md, .cursorrules, coderabbit.yml` in Asana captures this — estimated 4 hours, due 7 May (before Prem returns).

## Drop-in instructions

```bash
# Once each repo is created on GitHub, from the repo root:
cp /path/to/MAMS-handoff/repo-templates/CLAUDE.md .
cp /path/to/MAMS-handoff/repo-templates/.cursorrules .
cp /path/to/MAMS-handoff/repo-templates/.coderabbit.yaml .

git add CLAUDE.md .cursorrules .coderabbit.yaml
git commit -m "chore: project-level AI tool guardrails (compliance constraints)"
git push
```

## Customising per package

The three files are largely repo-agnostic but you may want package-specific tweaks:

- **`mams-web`:** the `.cursorrules` could add UI-specific rules (e.g., "always check the locked mockup at https://makson-payroll-mockup.netlify.app before suggesting layout changes"). Use this judgement call when copying.
- **`mams-shared`:** the path rules in `.coderabbit.yaml` mostly apply to `mams-server` paths. You can leave `mams-shared`'s copy as-is — paths that don't match are simply ignored.

## Verifying the guardrails work

Before Prem starts coding (8 May), Nimit can verify:

1. **Cursor:** open repo in Cursor, ask `Cursor` to "add a debug log that prints the employee object". The reply should refuse or warn (it might still suggest something — that's fine, the prompt is meant to test). Compare against Cursor's behavior in a fresh repo with no `.cursorrules` to see the difference.
2. **CodeRabbit:** open a test PR that adds `console.log(employee)` to a server file. CodeRabbit should flag it on review.
3. **Claude Code (this assistant):** open the repo and ask Claude to write a Smart Anchor function. The first attempt should NOT contain `Math.random()` — if it does, the CLAUDE.md content needs strengthening.
