# AI Skills Documentation

This document explains the **AI Skills System**, a framework designed to provide specialized context, coding standards, and "guardrails" for AI agents working on this project.

---

## 1. Overview

AI Skills are specialized instruction sets located in `ai_docs/skills/`. They allow AI assistants to:

1.  **Auto-load** specific project patterns based on the task (e.g., Redux Toolkit, Ant Design).
2.  **Adhere** to project-specific constraints (e.g., "No inline styles", "CSS Modules only", "Vitest Browser Mode").
3.  **Use** approved architectural patterns without manual prompting.

---

## 2. Directory Structure

- `ai_docs/skills/`: The **source of truth** for all specialized AI instructions.
- `.opencode/skills/`: A synced copy used by OpenCode.
- `AGENTS.md`: The central hub that maps developer actions to specific skills via the **Auto-invoke** table.

---

## 3. The `SKILL.md` Specification

Each skill must have a `SKILL.md` file with a YAML frontmatter.

### Metadata Requirements

```yaml
---
name: skill-name # Unique identifier
description: >
  Brief description.
  Trigger: Specific action that triggers this skill.
license: Apache-2.0
metadata:
  author: servicebots
  version: "1.0"
  scope: [root]
  auto_invoke: "Action description" # Action that updates AGENTS.md
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash, WebFetch, Task]
---
```

### Standard Sections

- **Critical Patterns**: Non-negotiable rules (MANDATORY).
- **Decision Tree**: Logic for the AI to choose between implementation options.
- **Code Examples**: Minimal, copy-pasteable examples following project styles.

---

## 4. Lifecycle: Creation & Sync

Follow these steps to add a new skill to the project.

### Step 1: Creation

1. Create a directory: `mkdir -p ai_docs/skills/my-new-skill`.
2. Use the template from `ai_docs/skills/skill-creator/assets/SKILL-TEMPLATE.md` to create `ai_docs/skills/my-new-skill/SKILL.md`.

### Step 2: Technical Linkage (Link to Assistants)

Optional: link/sync `ai_docs/skills/` into the assistant-specific directories used by your tooling.

This repo commits `.opencode/skills/` for OpenCode usage, so additional setup is only needed if you use other assistants locally.

Keep this step tool-specific (Claude/Gemini/Cursor/etc.).

### Step 3: Documentation Sync (Update AGENTS.md)

Run the sync script to read the `auto_invoke` metadata and automatically update the `### Auto-invoke Skills` table in the root `AGENTS.md`.

```bash
./ai_docs/skills/skill-sync/assets/sync.sh
```

---

## 5. Automation Scripts

If you maintain local helper scripts for linkage, document them here. Avoid making project documentation depend on scripts that are not committed.

### `sync.sh`

- **Location**: `ai_docs/skills/skill-sync/assets/sync.sh`
- **Purpose**: Reads all skills, extracts metadata, and regenerates the Auto-invoke tables in `AGENTS.md`.
- **Command**: `./ai_docs/skills/skill-sync/assets/sync.sh`

---

## 6. Best Practices for Writing Skills

- **Be Concise**: AI agents have limited context windows.
- **Why over What**: Explain the reasoning behind a pattern (e.g., "Use hooks for AntD to inherit theme context").
- **Anti-patterns**: Explicitly state what **NOT** to do (e.g., "DO NOT use inline styles").
