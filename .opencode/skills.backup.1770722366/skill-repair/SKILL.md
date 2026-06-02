---
name: skill-repair
description: >
  Automatically repairs format issues in SKILL.md files: line endings (CRLF→LF), missing license fields, missing metadata blocks, and incomplete metadata fields.
  Trigger: When a skill has format problems, incorrect line endings, or malformed metadata.
license: Apache-2.0
metadata:
  author: Jose Limardo
  version: "2.0"
  scope: [root]
  auto_invoke: null  # Infrastructure skill - not for auto-invoke table
allowed-tools: Read, Edit, Write, Bash
---

## When to Use

Use this skill when:

- A SKILL.md file has Windows line endings (CRLF) instead of Unix (LF)
- Required fields are missing (`license`, `metadata.author`, `metadata.version`, `metadata.scope`, `metadata.auto_invoke`)
- YAML frontmatter is malformed or has incorrect indentation
- The metadata block is completely missing
- Skills copied from Windows systems show parsing errors
- The sync script reports skills as "unnamed" or missing metadata

---

## What It Repairs Automatically

The repair script (`repair.sh`) automatically fixes:

1. **Line Endings**: CRLF → LF conversion
2. **Missing License Field**: Adds `license: Apache-2.0`
3. **Missing Metadata Block**: Adds complete metadata structure
4. **Missing Author Field**: Adds `author: Jose Limardo`
5. **Missing Version Field**: Adds `version: "1.0"`
6. **Missing Scope Field**: Adds `scope: [root]`
7. **Missing Auto-invoke Field**: Adds `auto_invoke: "TODO: Add auto-invoke description"` (requires manual update)

---

## Critical Patterns

### Pattern 1: Line Ending Detection

Skills copied from Windows often have CRLF (`\r\n`) line endings. Bash/awk scripts expect LF (`\n`).

**Detection:**

```bash
# Check for CRLF line endings
file ai_docs/skills/*/SKILL.md | grep CRLF

# Or check with od command
od -c ai_docs/skills/skill-name/SKILL.md | head -n 5 | grep '\\r'
```

**Repair (PowerShell):**

```powershell
$content = Get-Content -Path "docs\skills\skill-name\SKILL.md" -Raw
$content -replace "`r`n", "`n" | Set-Content -Path "docs\skills\skill-name\SKILL.md" -NoNewline
```

**Repair (Bash with sed):**

```bash
sed -i 's/\r$//' ai_docs/skills/skill-name/SKILL.md
```

---

### Pattern 2: YAML Frontmatter Validation

Required frontmatter structure:

```yaml
---
name: skill-name
description: >
  Brief description.
  Trigger: When to use this skill.
license: Apache-2.0 | MIT
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [root] # Optional but recommended
  auto_invoke: "Action" # Optional but recommended for auto-invoke table
---
```

**Common Issues:**

- Missing closing `---`
- Incorrect YAML indentation (must be 2 spaces)
- Missing required fields
- Unquoted version numbers (must be `"1.0"` not `1.0`)

---

### Pattern 3: Metadata Extraction Test

Test if metadata can be extracted correctly:

```bash
# Create test script
cat > test_metadata.sh << 'EOF'
#!/bin/bash
source ai_docs/skills/skill-sync/assets/sync.sh 2>/dev/null

file="$1"
echo "Testing: $file"
echo "  name: $(extract_field "$file" "name")"
echo "  scope: $(extract_metadata "$file" "scope")"
echo "  auto_invoke: $(extract_metadata "$file" "auto_invoke")"
EOF

bash test_metadata.sh ai_docs/skills/skill-name/SKILL.md
```

If extraction returns empty values, the file has format issues.

---

## Decision Tree

```
Has format issues?
  → Check line endings first        → Convert CRLF to LF
  → Check YAML frontmatter          → Fix indentation/structure
  → Check required fields           → Add missing fields
  → Run sync.sh                     → Verify no errors
  → Re-test with metadata script    → Should extract correctly
```

---

## Repair Workflow

### Automated Repair (Recommended)

```bash
# Run the repair script - fixes everything automatically
bash ai_docs/skills/skill-repair/assets/repair.sh
```

The script will:

1. Convert CRLF → LF on all SKILL.md files
2. Add missing `license` fields
3. Add missing `metadata` blocks with default values
4. Add missing metadata fields (`author`, `version`, `scope`, `auto_invoke`)
5. Test metadata extraction
6. Run sync script to update AGENTS.md

**Important:** After running, search for `TODO` in auto_invoke fields and update manually with proper descriptions.

### Manual Repair (Advanced)

#### Step 1: Identify Problem Skills

```bash
# Run sync script to identify issues
bash ai_docs/skills/skill-sync/assets/sync.sh

# Skills showing "[unnamed - ...]" have format problems
```

#### Step 2: Check Line Endings

```bash
# Check all skills for CRLF
for f in ai_docs/skills/*/SKILL.md; do
  if od -c "$f" | head -n 2 | grep -q '\\r'; then
    echo "CRLF found in: $f"
  fi
done
```

#### Step 3: Fix Line Endings Manually

**On Windows (PowerShell):**

```powershell
# Fix single file
$content = Get-Content -Path "docs\skills\skill-name\SKILL.md" -Raw
$content -replace "`r`n", "`n" | Set-Content -Path "docs\skills\skill-name\SKILL.md" -NoNewline

# Fix all skills
Get-ChildItem -Path "docs\skills\*\SKILL.md" -Recurse | ForEach-Object {
    $content = Get-Content -Path $_.FullName -Raw
    $content -replace "`r`n", "`n" | Set-Content -Path $_.FullName -NoNewline
    Write-Host "Fixed: $($_.FullName)"
}
```

**On Unix/Mac (Bash):**

```bash
# Fix single file
sed -i 's/\r$//' ai_docs/skills/skill-name/SKILL.md

# Fix all skills
find ai_docs/skills -name "SKILL.md" -type f -exec sed -i 's/\r$//' {} \;
```

#### Step 4: Validate YAML Structure

Check that:

- Opening `---` on line 1
- Closing `---` after metadata block
- All fields properly indented (2 spaces for nested fields)
- Strings with special characters are quoted
- Version is quoted: `"1.0"` not `1.0`

#### Step 5: Add Missing Metadata Manually

If missing `scope` and `auto_invoke` for auto-invoke table:

```yaml
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [root] # or [ui], [api], [root, state], etc.
  auto_invoke: "Brief action description" # First word should be action verb
```

### Step 6: Verify Repair

```bash
# Run sync script again - should show no errors
bash ai_docs/skills/skill-sync/assets/sync.sh

# Expected output:
# "All skills have sync metadata"
```

---

## Common Issues & Solutions

| Issue                        | Symptom                          | Solution                                             |
| ---------------------------- | -------------------------------- | ---------------------------------------------------- |
| CRLF line endings            | `[unnamed - ...]` in sync output | Convert to LF with sed or PowerShell                 |
| Missing name field           | Empty extraction                 | Add `name:` in frontmatter                           |
| Unquoted version             | Parse error                      | Change `version: 1.0` to `version: "1.0"`            |
| Wrong indentation            | Metadata not extracted           | Use 2 spaces for YAML indentation                    |
| Missing metadata block       | No scope/auto_invoke             | Add complete `metadata:` section                     |
| Special chars in description | Parse error                      | Wrap description in quotes or use `>` for multi-line |

---

## Bulk Repair Script

Create `repair_all_skills.sh`:

```bash
#!/bin/bash
# Repair all SKILL.md files in ai_docs/skills/

SKILLS_DIR="ai_docs/skills"

echo "Repairing all SKILL.md files..."

# Fix line endings
echo "1. Converting CRLF to LF..."
find "$SKILLS_DIR" -name "SKILL.md" -type f | while read -r file; do
    if od -c "$file" | head -n 2 | grep -q $'\\r'; then
        sed -i 's/\r$//' "$file"
        echo "  Fixed: $file"
    fi
done

# Validate YAML frontmatter
echo ""
echo "2. Validating YAML frontmatter..."
find "$SKILLS_DIR" -name "SKILL.md" -type f | while read -r file; do
    if ! head -n 1 "$file" | grep -q '^---$'; then
        echo "  WARNING: $file - missing opening ---"
    fi
done

# Test metadata extraction
echo ""
echo "3. Testing metadata extraction..."
find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name "SKILL.md" -type f | while read -r file; do
    name=$(awk '/^---$/ { fm = !fm; next } fm && /^name:/ { sub(/^name:[[:space:]]*/, ""); print; exit }' "$file")
    if [ -z "$name" ]; then
        echo "  WARNING: $file - cannot extract name"
    fi
done

echo ""
echo "4. Running sync script..."
bash ai_docs/skills/skill-sync/assets/sync.sh

echo ""
echo "Done! Check output above for any remaining issues."
```

---

## Resources

- **Sync Script**: [ai_docs/skills/skill-sync/assets/sync.sh](../skill-sync/assets/sync.sh)
- **YAML Spec**: Use 2-space indentation, quote version strings
- **Line Endings**: Always use LF (`\n`) for cross-platform compatibility
