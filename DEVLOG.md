# Dev Log

## 2026-03-08: Standalone Project Conversion

**Goal:** Detach from the upstream `openclaw/openclaw` fork and make this a standalone project under `Rekonquest/openclaw`.

**Branch:** `claude/standalone-app-conversion-OcjH4`
**Commit:** `574d57a` — "Convert to standalone project: update all GitHub references to Rekonquest/openclaw"
**Base commit (revert target):** `f943c76`

### What changed (83 files, 157 insertions, 157 deletions)

All changes are a straightforward find-and-replace. No logic, code behavior, or config file paths were altered.

#### 1. package.json
- `homepage` → `https://github.com/Rekonquest/openclaw#readme`
- `bugs.url` → `https://github.com/Rekonquest/openclaw/issues`
- `repository.url` → `git+https://github.com/Rekonquest/openclaw.git`

#### 2. README.md
- Logo image URLs: `raw.githubusercontent.com/openclaw/openclaw` → `Rekonquest/openclaw`
- CI badge: `img.shields.io/.../openclaw/openclaw` → `Rekonquest/openclaw`
- Release badge: same pattern
- Star History chart: `star-history.com/...openclaw/openclaw` → `Rekonquest/openclaw`
- Clone URL: `git clone https://github.com/Rekonquest/openclaw.git`
- DeepWiki link: `deepwiki.com/Rekonquest/openclaw`

#### 3. .github/FUNDING.yml
- Sponsor link: `steipete` → `Rekonquest`

#### 4. CONTRIBUTING.md
- All `github.com/openclaw/openclaw` URLs → `Rekonquest/openclaw`
- Display labels `[openclaw/openclaw]` → `[Rekonquest/openclaw]`

#### 5. AGENTS.md (also symlinked as CLAUDE.md)
- Repo URL: `https://github.com/Rekonquest/openclaw`

#### 6. SECURITY.md
- All GitHub URLs → `Rekonquest/openclaw`

#### 7. scripts/docs-i18n/go.mod
- Go module path: `github.com/Rekonquest/openclaw/scripts/docs-i18n`

#### 8. scripts/ (3 files)
- `changelog-to-html.sh` — changelog link
- `make_appcast.sh` — Sparkle download URL prefix
- `shell-helpers/clawdock-helpers.sh` — clone URL
- `package-mac-app.sh` — GitHub reference

#### 9. docs/ (English, 20 files)
All `github.com/openclaw/openclaw` references in install guides, platform docs, release docs, FAQ, etc.

#### 10. docs/zh-CN/ (Chinese translations, 20 files)
Mirror of English docs changes.

#### 11. src/ (15 source files)
Internal GitHub URL references in comments, constants, and error messages:
- `src/agents/system-prompt.ts`, `src/agents/tools/cron-tool.ts`, etc.
- `src/commands/doctor-workspace.ts` — commit reference URLs
- `src/cli/update-cli/shared.ts` — update check URL
- `src/telegram/fetch.ts`, `src/infra/outbound/targets.ts`, etc.

#### 12. ui/ (1 file)
- `ui/src/ui/controllers/chat.ts` — issue reference URL

#### 13. docs/docs.json
- GitHub navbar link → `Rekonquest/openclaw`
- Releases link → `Rekonquest/openclaw`

### What was NOT changed
- **Package/binary name:** still `openclaw`
- **App bundle IDs:** still `ai.openclaw.*` (Android, iOS, macOS)
- **Environment variables:** still `OPENCLAW_*` prefix
- **Config file paths:** still `~/.openclaw/openclaw.json`
- **Branding/product name:** still "OpenClaw"
- **LICENSE:** kept original MIT copyright (Peter Steinberger)
- **External repo references:** `openclaw/openclaw-ansible`, `openclaw/nix-openclaw`, `openclaw/clawhub`, `openclaw/trust` left as-is (separate projects)
- **Discord, docs.openclaw.ai, openclaw.ai domains:** unchanged

### How to revert

```bash
# Revert the conversion commit entirely:
git revert 574d57a

# Or hard reset to the pre-conversion state:
git reset --hard f943c76
```

### Remaining manual steps
- **GitHub Settings:** Go to repo Settings > General and request "Detach fork" to fully remove the fork relationship from GitHub's side.
- **Future rebrand:** If renaming the package/binary/brand later, that's a separate larger effort involving bundle IDs, env vars, config paths, npm package name, and app store identifiers.
