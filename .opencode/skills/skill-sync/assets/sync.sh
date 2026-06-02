#!/usr/bin/env bash
# Sync skill metadata to AGENTS.md Auto-invoke sections
# Usage: ./sync.sh [--dry-run] [--scope <scope>]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SKILLS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Options
DRY_RUN=false
FILTER_SCOPE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --scope)
            FILTER_SCOPE="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--dry-run] [--scope <scope>]"
            echo ""
            echo "Options:"
            echo "  --dry-run    Show what would change without modifying files"
            echo "  --scope      Only sync specific scope (root, ui, api, sdk, mcp_server)"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Map scope to AGENTS.md path
get_agents_path() {
    local scope="$1"
    echo "$REPO_ROOT/AGENTS.md"
}

# Extract YAML frontmatter field using awk
extract_field() {
    local file="$1"
    local field="$2"
    awk -v field="$field" '
        /^---$/ { in_frontmatter = !in_frontmatter; next }
        in_frontmatter && $1 == field":" {
            # Handle single line value
            sub(/^[^:]+:[[:space:]]*/, "")
            if ($0 != "" && $0 != ">") {
                gsub(/^["'\'']|["'\'']$/, "")  # Remove quotes
                print
                exit
            }
            # Handle multi-line value
            getline
            while (/^[[:space:]]/ && !/^---$/) {
                sub(/^[[:space:]]+/, "")
                printf "%s ", $0
                if (!getline) break
            }
            print ""
            exit
        }
    ' "$file" | sed 's/[[:space:]]*$//'
}

# Extract nested metadata field
#
# Supports either:
#   auto_invoke: "Single Action"
# or:
#   auto_invoke:
#     - "Action A"
#     - "Action B"
#
# For list values, this returns a pipe-delimited string: "Action A|Action B"
extract_metadata() {
    local file="$1"
    local field="$2"

    awk -v field="$field" '
        function trim(s) {
            sub(/^[[:space:]]+/, "", s)
            sub(/[[:space:]]+$/, "", s)
            return s
        }

        /^---$/ { in_frontmatter = !in_frontmatter; next }

        in_frontmatter && /^metadata:/ { in_metadata = 1; next }
        in_frontmatter && in_metadata && /^[a-z]/ && !/^[[:space:]]/ { in_metadata = 0 }

        in_frontmatter && in_metadata && $1 == field":" {
            # Remove "field:" prefix
            sub(/^[^:]+:[[:space:]]*/, "")

            # Single-line scalar: auto_invoke: "Action"
            if ($0 != "") {
                v = $0
                gsub(/^["'\'']|["'\'']$/, "", v)
                gsub(/^\[|\]$/, "", v)  # legacy: allow inline [a, b]
                print trim(v)
                exit
            }

            # Multi-line list:
            # auto_invoke:
            #   - "Action A"
            #   - "Action B"
            out = ""
            while (getline) {
                # Stop when leaving metadata block
                if (!in_frontmatter) break
                if (!in_metadata) break
                if ($0 ~ /^[a-z]/ && $0 !~ /^[[:space:]]/) break

                # On multi-line list, only accept "- item" lines. Anything else ends the list.
                line = $0
                # Stop at frontmatter delimiter (getline bypasses pattern matching)
                if (line ~ /^---$/) break
                if (line ~ /^[[:space:]]*-[[:space:]]*/) {
                    sub(/^[[:space:]]*-[[:space:]]*/, "", line)
                    line = trim(line)
                    gsub(/^["'\'']|["'\'']$/, "", line)
                    if (line != "") {
                        if (out == "") out = line
                        else out = out "|" line
                    }
                } else {
                    break
                }
            }

            if (out != "") print out
            exit
        }
    ' "$file"
}

echo -e "${BLUE}Skill Sync - Updating AGENTS.md Auto-invoke sections${NC}"
echo "========================================================"
echo ""

# Collect skills by scope
# Note: Using manual string-based associative mapping for compatibility with older Bash (e.g., 3.2 on macOS)
SCOPE_LIST="" # Space-separated list of scopes
SCOPE_DATA="" # Combined "scope;skill:action|skill:action..." data

# Deterministic iteration order (stable diffs)
while IFS= read -r skill_file; do
    [ -f "$skill_file" ] || continue

    skill_name=$(extract_field "$skill_file" "name")
    scope_raw=$(extract_metadata "$skill_file" "scope")
    description=$(extract_field "$skill_file" "description")

    auto_invoke_raw=$(extract_metadata "$skill_file" "auto_invoke")
    auto_invoke=${auto_invoke_raw//|/;; }

    # Skip if auto_invoke is explicitly null (infrastructure skills)
    if [[ "$auto_invoke_raw" == "null" ]] || [[ "$auto_invoke_raw" =~ ^null[[:space:]]*# ]]; then
        continue
    fi

    # If auto_invoke is missing, try to extract trigger from description
    if [ -z "$auto_invoke" ] && [ -n "$description" ]; then
        # Extract text after "Trigger:" if present
        if [[ "$description" =~ [Tt]rigger:[[:space:]]*(.*) ]]; then
            auto_invoke="${BASH_REMATCH[1]}"
        fi
    fi

    # Skip if no scope or auto_invoke defined
    [ -z "$scope_raw" ] || [ -z "$auto_invoke" ] && continue

    # Parse scope (can be comma-separated or space-separated)
    IFS=', ' read -ra scopes <<< "$scope_raw"

    for scope in "${scopes[@]}"; do
        scope=$(echo "$scope" | tr -d '[:space:]')
        [ -z "$scope" ] && continue

        # Filter by scope if specified
        [ -n "$FILTER_SCOPE" ] && [ "$scope" != "$FILTER_SCOPE" ] && continue

        # Track scopes
        if [[ ! " $SCOPE_LIST " =~ " $scope " ]]; then
            SCOPE_LIST="$SCOPE_LIST $scope"
        fi

        # Store skill:action with a special delimiter (newline) to preserve spaces
        SCOPE_DATA="${SCOPE_DATA}${scope}:[${skill_name}:${auto_invoke}]
"
    done
done < <(find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name SKILL.md -print | sort)

# Group all scopes that map to the same AGENTS.md file
# Since get_agents_path always returns the same file, process it once with all scopes combined
unique_paths=$(for scope in $(echo "$SCOPE_LIST" | tr ' ' '\n'); do
    get_agents_path "$scope"
done | sort -u)

for agents_path in $unique_paths; do
    if [ -z "$agents_path" ] || [ ! -f "$agents_path" ]; then
        echo -e "${YELLOW}Warning: AGENTS.md not found: $agents_path${NC}"
        continue
    fi

    echo -e "${BLUE}Processing: $(basename "$(dirname "$agents_path")")/AGENTS.md (combining all scopes)${NC}"

    # Build the Auto-invoke table combining ALL scopes that map to this file
    auto_invoke_section="### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|"

    rows=()
    # Extract entries for ALL scopes that map to this agents_path
    for check_scope in $(echo "$SCOPE_LIST" | tr ' ' '\n'); do
        check_path=$(get_agents_path "$check_scope")
        [ "$check_path" != "$agents_path" ] && continue

        # Use a while loop reading line by line to preserve spaces in entries
        while IFS= read -r entry; do
            [ -z "$entry" ] && continue
            if [[ $entry == ${check_scope}:* ]]; then
                # Extract content between []
                inner=${entry#*[}
                inner=${inner%]}
                
                skill_name="${inner%%:*}"
                actions_raw="${inner#*:}"
                
                # Restore pipe characters
                actions_raw=${actions_raw//;; /|}
                
                IFS='|' read -ra actions <<< "$actions_raw"
                for action in "${actions[@]}"; do
                    action="$(echo "$action" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
                    [ -z "$action" ] && continue
                    rows+=("$action	$skill_name")
                done
            fi
        done <<< "$SCOPE_DATA"
    done

    # Sort rows, remove duplicates, and build the table
    while IFS=$'\t' read -r action skill_name; do
        [ -z "$action" ] && continue
        auto_invoke_section="$auto_invoke_section
| $action | \`$skill_name\` |"
    done < <(printf "%s\n" "${rows[@]}" | LC_ALL=C sort -u -t $'\t' -k1,1 -k2,2)

    if $DRY_RUN; then
        echo -e "${YELLOW}[DRY RUN] Would update $agents_path with:${NC}"
        echo "$auto_invoke_section"
        echo ""
    else
        # Write new section to temp file (avoids awk multi-line string issues on macOS)
        section_file=$(mktemp)
        echo "$auto_invoke_section" > "$section_file"

        # Check if Auto-invoke section exists
        if grep -q "### Auto-invoke Skills" "$agents_path"; then
            # Replace existing section (up to next --- or ## heading)
            awk '
                /^### Auto-invoke Skills/ {
                    while ((getline line < "'"$section_file"'") > 0) print line
                    close("'"$section_file"'")
                    skip = 1
                    next
                }
                skip && /^(---|## )/ {
                    skip = 0
                    print ""
                }
                !skip { print }
            ' "$agents_path" > "$agents_path.tmp"
            mv "$agents_path.tmp" "$agents_path"
            echo -e "${GREEN}  ✓ Updated Auto-invoke section${NC}"
        else
            # Insert after Skills Reference blockquote
            awk '
                /^>.*SKILL\.md\)$/ && !inserted {
                    print
                    getline
                    if (/^$/) {
                        print ""
                        while ((getline line < "'"$section_file"'") > 0) print line
                        close("'"$section_file"'")
                        print ""
                        inserted = 1
                        next
                    }
                }
                { print }
            ' "$agents_path" > "$agents_path.tmp"
            mv "$agents_path.tmp" "$agents_path"
            echo -e "${GREEN}  ✓ Inserted Auto-invoke section${NC}"
        fi

        rm -f "$section_file"
    fi

    # Build the Available Skills table
    echo -e "${BLUE}  Updating Available Skills section...${NC}"
    
    available_skills_section="## Available Skills

Use these skills for detailed patterns on-demand:

| Skill | Description | Trigger |
|-------|-------------|---------|"

    skill_rows=()
    while IFS= read -r skill_file; do
        [ -f "$skill_file" ] || continue
        
        skill_name=$(extract_field "$skill_file" "name")
        description=$(extract_field "$skill_file" "description")
        
        [ -z "$skill_name" ] && continue
        [ -z "$description" ] && continue
        
        # Extract the trigger part from description (after "Trigger:")
        trigger=""
        short_description=""
        
        if [[ "$description" =~ (.+)[[:space:]]*[Tt]rigger:[[:space:]]*(.*) ]]; then
            # Has explicit trigger
            short_description="${BASH_REMATCH[1]}"
            trigger="${BASH_REMATCH[2]}"
            # Clean up trailing whitespace and periods
            short_description="$(echo "$short_description" | sed 's/[[:space:]]*\.*[[:space:]]*$//')"
            trigger="$(echo "$trigger" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
        else
            # No explicit trigger - use description for both, but truncate description
            # Extract first sentence or first 100 chars
            if [[ "$description" =~ ^([^.]+\.) ]]; then
                short_description="${BASH_REMATCH[1]}"
            else
                short_description="${description:0:100}"
                [ ${#description} -gt 100 ] && short_description="$short_description..."
            fi
            trigger="$description"
        fi
        
        skill_rows+=("$skill_name	$short_description	$trigger")
    done < <(find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name SKILL.md -print | sort)
    
    # Sort by skill name and build table
    while IFS=$'\t' read -r skill_name short_description trigger; do
        [ -z "$skill_name" ] && continue
        available_skills_section="$available_skills_section
| \`$skill_name\` | $short_description | $trigger |"
    done < <(printf "%s\n" "${skill_rows[@]}" | LC_ALL=C sort -t $'\t' -k1,1)
    
    available_skills_section="$available_skills_section

To load a skill: \`/skill <name>\` or \`use skill <name>\`

**⚠️ CRITICAL**: Always invoke the \`vitest\` skill BEFORE writing or modifying any tests."
    
    if $DRY_RUN; then
        echo -e "${YELLOW}[DRY RUN] Would update Available Skills section with:${NC}"
        echo "$available_skills_section"
        echo ""
    else
        # Write available skills section to temp file
        available_section_file=$(mktemp)
        echo "$available_skills_section" > "$available_section_file"
        
        # Check if Available Skills section exists
        if grep -q "## Available Skills" "$agents_path"; then
            # Replace only the table part, keep Auto-invoke subsection
            awk '
                /^## Available Skills/ {
                    while ((getline line < "'"$available_section_file"'") > 0) print line
                    close("'"$available_section_file"'")
                    skip = 1
                    next
                }
                skip && /^### Auto-invoke Skills/ {
                    skip = 0
                    print ""
                }
                skip && /^## / {
                    skip = 0
                    print ""
                }
                !skip { print }
            ' "$agents_path" > "$agents_path.tmp"
            mv "$agents_path.tmp" "$agents_path"
            echo -e "${GREEN}  ✓ Updated Available Skills section${NC}"
        fi
        
        rm -f "$available_section_file"
    fi
done

echo ""
echo -e "${GREEN}Done!${NC}"

# Show skills without metadata
echo ""
echo -e "${BLUE}Skills missing sync metadata:${NC}"
missing=0
while IFS= read -r skill_file; do
    [ -f "$skill_file" ] || continue
    skill_name=$(extract_field "$skill_file" "name")
    scope_raw=$(extract_metadata "$skill_file" "scope")
    auto_invoke_raw=$(extract_metadata "$skill_file" "auto_invoke")
    auto_invoke=${auto_invoke_raw//|/;;}

    if [ -z "$scope_raw" ] || [ -z "$auto_invoke" ]; then
        echo -e "  ${YELLOW}${skill_name:-[unnamed - $skill_file]}${NC} - missing: ${scope_raw:+}${scope_raw:-scope} ${auto_invoke:+}${auto_invoke:-auto_invoke}"
        missing=$((missing + 1))
    fi
done < <(find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name SKILL.md -print | sort)

if [ $missing -eq 0 ]; then
    echo -e "  ${GREEN}All skills have sync metadata${NC}"
fi
