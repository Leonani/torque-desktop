#!/bin/bash
# Repair all SKILL.md files in ai_docs/skills/
# Automatically fixes: line endings, missing metadata, missing fields

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Skill Repair - Fixing SKILL.md format issues${NC}"
echo "=============================================="
echo ""

# Counter for issues found
ISSUES_FIXED=0
WARNINGS=0
METADATA_ADDED=0

# Step 1: Fix line endings (CRLF to LF)
echo -e "${YELLOW}[1/4] Converting CRLF to LF...${NC}"
find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name "SKILL.md" -type f | while read -r file; do
    if od -c "$file" | head -n 2 | grep -q $'\\r'; then
        sed -i 's/\r$//' "$file" 2>/dev/null || {
            # Fallback for systems without -i flag
            sed 's/\r$//' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        }
        echo -e "  ${GREEN}✓${NC} Fixed: $(basename "$(dirname "$file")")/SKILL.md"
        ISSUES_FIXED=$((ISSUES_FIXED + 1))
    fi
done

if [ $ISSUES_FIXED -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} All files have correct line endings"
fi

echo ""

# Step 2: Add missing license field
echo -e "${YELLOW}[2/6] Adding missing license field...${NC}"
find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name "SKILL.md" -type f | while read -r file; do
    if ! grep -q '^license:' "$file"; then
        # Insert license after description field
        awk '/^description:/ { print; print "license: Apache-2.0"; next } 1' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        echo -e "  ${GREEN}✓${NC} Added license: $(basename "$(dirname "$file")")/SKILL.md"
        METADATA_ADDED=$((METADATA_ADDED + 1))
    fi
done

if [ $METADATA_ADDED -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} All files have license field"
fi

echo ""

# Step 3: Add missing metadata block
echo -e "${YELLOW}[3/6] Adding missing metadata block...${NC}"
METADATA_ADDED=0
find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name "SKILL.md" -type f | while read -r file; do
    if ! grep -q '^metadata:' "$file"; then
        # Get skill name from directory
        skill_name=$(basename "$(dirname "$file")")
        
        # Insert metadata block before closing ---
        awk '/^---$/ && !first { first=1; next } 
             /^---$/ && first { 
                 print "metadata:"
                 print "  author: servicebots"
                 print "  version: \"1.0\""
                 print "  scope: [root]"
                 print "  auto_invoke: \"TODO: Add auto-invoke description\""
                 print "---"
                 next 
             } 
             1' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        
        echo -e "  ${GREEN}✓${NC} Added metadata block: $(basename "$(dirname "$file")")/SKILL.md"
        METADATA_ADDED=$((METADATA_ADDED + 1))
    fi
done

if [ $METADATA_ADDED -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} All files have metadata block"
fi

echo ""

# Step 4: Validate required metadata fields
echo -e "${YELLOW}[4/6] Validating metadata fields...${NC}"
find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name "SKILL.md" -type f | while read -r file; do
    if grep -q '^metadata:' "$file"; then
        # Check for required fields in metadata block
        if ! awk '/^metadata:/,/^---$/' "$file" | grep -q '^  author:'; then
            # Add missing author field
            awk '/^metadata:/ { print; print "  author: servicebots"; next } 1' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
            echo -e "  ${GREEN}✓${NC} Added author field: $(basename "$(dirname "$file")")/SKILL.md"
        fi
        
        if ! awk '/^metadata:/,/^---$/' "$file" | grep -q '^  version:'; then
            # Add missing version field after author
            awk '/^metadata:/,/^---$/ { if (/^  author:/ && !found_version) { print; print "  version: \"1.0\""; next } if (/^  version:/) found_version=1 } 1' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
            echo -e "  ${GREEN}✓${NC} Added version field: $(basename "$(dirname "$file")")/SKILL.md"
        fi
        
        if ! awk '/^metadata:/,/^---$/' "$file" | grep -q '^  scope:'; then
            # Add missing scope field after version
            awk '/^metadata:/,/^---$/ { if (/^  version:/ && !found_scope) { print; print "  scope: [root]"; next } if (/^  scope:/) found_scope=1 } 1' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
            echo -e "  ${GREEN}✓${NC} Added scope field: $(basename "$(dirname "$file")")/SKILL.md"
        fi
        
        if ! awk '/^metadata:/,/^---$/' "$file" | grep -q '^  auto_invoke:'; then
            # Add missing auto_invoke field after scope
            awk '/^metadata:/,/^---$/ { if (/^  scope:/ && !found_auto) { print; print "  auto_invoke: \"TODO: Add auto-invoke description\""; next } if (/^  auto_invoke:/) found_auto=1 } 1' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
            echo -e "  ${YELLOW}⚠${NC}  Added auto_invoke (needs manual update): $(basename "$(dirname "$file")")/SKILL.md"
        fi
    fi
done

echo -e "  ${GREEN}✓${NC} Metadata validation complete"
echo ""

# Step 5: Test metadata extraction
echo -e "${YELLOW}[5/6] Testing metadata extraction...${NC}"
EXTRACTION_ERRORS=0
find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name "SKILL.md" -type f | while read -r file; do
    # Simple name extraction test
    name=$(awk '/^---$/ { fm = !fm; next } fm && /^name:/ { sub(/^name:[[:space:]]*/, ""); print; exit }' "$file")
    
    if [ -z "$name" ]; then
        echo -e "  ${RED}✗${NC} Cannot extract name: $(basename "$(dirname "$file")")/SKILL.md"
        EXTRACTION_ERRORS=$((EXTRACTION_ERRORS + 1))
    fi
done

if [ $EXTRACTION_ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} All skills have extractable metadata"
fi

echo ""

# Step 6: Run sync script to verify
echo -e "${YELLOW}[6/6] Running sync script...${NC}"
SYNC_SCRIPT="$(cd "$SKILLS_DIR/skill-sync/assets" && pwd)/sync.sh"

if [ -f "$SYNC_SCRIPT" ]; then
    bash "$SYNC_SCRIPT"
else
    echo -e "  ${YELLOW}⚠${NC}  Sync script not found: $SYNC_SCRIPT"
fi

echo ""
echo "=============================================="

if [ $ISSUES_FIXED -gt 0 ]; then
    echo -e "${GREEN}✓ Fixed $ISSUES_FIXED line ending issue(s)${NC}"
fi

if [ $METADATA_ADDED -gt 0 ]; then
    echo -e "${GREEN}✓ Added/repaired metadata in multiple files${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $WARNINGS warning(s) - review output above${NC}"
else
    echo -e "${GREEN}✓ No warnings - all skills are properly formatted${NC}"
fi

echo ""
echo -e "${BLUE}Tip: Check for 'TODO' in auto_invoke fields and update manually.${NC}"
