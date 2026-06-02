# Skill Repair

Detects and repairs format issues in SKILL.md files.

## Quick Start

```bash
# Repair all skills (Bash)
bash ai_docs/skills/skill-repair/assets/repair.sh

# Repair all skills (PowerShell)
.\ai_docs\skills\skill-repair\assets\repair.ps1

# Dry run (PowerShell only)
.\ai_docs\skills\skill-repair\assets\repair.ps1 -DryRun
```

## What It Fixes

1. **Line endings**: Converts CRLF (Windows) to LF (Unix)
2. **YAML validation**: Checks frontmatter structure
3. **Metadata extraction**: Verifies fields can be parsed
4. **Auto-sync**: Runs skill-sync to update AGENTS.md

## Common Symptoms

- Sync script shows `[unnamed - ...]` for some skills
- Skills missing from Auto-invoke table in AGENTS.md
- Metadata extraction returns empty values
- Copy-pasted skills from Windows systems

## Manual Repair (Single File)

**PowerShell:**

```powershell
$content = Get-Content -Path "ai_docs\skills\skill-name\SKILL.md" -Raw
$content -replace "`r`n", "`n" | Set-Content -Path "ai_docs\skills\skill-name\SKILL.md" -NoNewline
```

**Bash:**

```bash
sed -i 's/\r$//' ai_docs/skills/skill-name/SKILL.md
```

## Required YAML Structure

```yaml
---
name: skill-name
description: >
  Brief description.
  Trigger: When to use.
license: Apache-2.0
metadata:
  author: servicebots
  version: "1.0"
  scope: [root]
  auto_invoke: "Action description"
---
```

## After Repair

Run sync to verify:

```bash
bash ai_docs/skills/skill-sync/assets/sync.sh
```

Expected output: `All skills have sync metadata`
