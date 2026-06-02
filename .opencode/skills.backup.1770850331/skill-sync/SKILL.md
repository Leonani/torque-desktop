---
name: skill-sync
description: >
  Syncs skill metadata to AGENTS.md Auto-invoke sections.
  Trigger: When updating skill metadata (metadata.scope/metadata.auto_invoke), regenerating Auto-invoke tables, or running ./skills/skill-sync/assets/sync.sh (including --dry-run/--scope).
license: Apache-2.0
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [root]
  auto_invoke: null # Infrastructure skill - not for auto-invoke table
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Purpose

Keeps AGENTS.md Auto-invoke sections in sync with skill metadata. When you create or modify a skill, run the sync script to automatically update all affected AGENTS.md files.

## Required Skill Metadata

Each skill that should appear in Auto-invoke sections needs these fields in `metadata`.

`auto_invoke` should be a **specific, actionable description** of when to invoke the skill:

```yaml
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [ui] # Which AGENTS.md: ui, api, sdk, root

  # ✅ GOOD: Specific action that clearly indicates when to invoke
  auto_invoke: "Writing React 19 components/hooks"

  # ❌ BAD: Too generic - AI won't know when to invoke
  # auto_invoke: "Writing components"

  # Option B: multiple actions (less common)
  # auto_invoke:
  #   - "Creating/modifying components"
  #   - "Refactoring component folder placement"
```

**Best Practices for `auto_invoke`:**

- Be specific about WHAT the user is doing (e.g., "Writing React 19 components" not just "Writing")
- Include context when it changes behavior (e.g., "using Ant Design", "using RTK Query")
- Use action verbs from the user's perspective (e.g., "User asks to...", "When writing...", "After making...")
- If the skill has a "Trigger:" in the description, the auto_invoke should match or reference it

### Scope Values

| Scope        | Updates                 |
| ------------ | ----------------------- |
| `root`       | `AGENTS.md` (repo root) |
| `ui`         | `ui/AGENTS.md`          |
| `api`        | `api/AGENTS.md`         |
| `sdk`        | `sdk/AGENTS.md`         |
| `mcp_server` | `mcp_server/AGENTS.md`  |

Skills can have multiple scopes: `scope: [ui, api]`

---

## Usage

### After Creating/Modifying a Skill

```bash
./skills/skill-sync/assets/sync.sh
```

### What It Does

1. Reads all `skills/*/SKILL.md` files
2. Extracts `metadata.scope` and `metadata.auto_invoke`
3. If `auto_invoke` is missing, falls back to extracting the "Trigger:" from the description
4. Generates two tables for each AGENTS.md:
   - `## Available Skills` - All skills with descriptions and triggers
   - `### Auto-invoke Skills` - Specific actions that trigger each skill
5. Updates both sections in the AGENTS.md file(s)

---

## Example

Given this skill metadata:

```yaml
# skills/prowler-ui/SKILL.md
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [ui]
  auto_invoke: "Creating/modifying React components"
```

The sync script generates in `ui/AGENTS.md`:

```markdown
### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action                              | Skill      |
| ----------------------------------- | ---------- |
| Creating/modifying React components | `react-19` |
```

---

## Commands

```bash
# Sync all AGENTS.md files
./skills/skill-sync/assets/sync.sh

# Dry run (show what would change)
./skills/skill-sync/assets/sync.sh --dry-run

# Sync specific scope only
./skills/skill-sync/assets/sync.sh --scope ui
```

---

## Checklist After Modifying Skills

- [ ] Added `metadata.scope` to new/modified skill
- [ ] Added `metadata.auto_invoke` with action description
- [ ] Ran `./skills/skill-sync/assets/sync.sh`
- [ ] Verified AGENTS.md files updated correctly
