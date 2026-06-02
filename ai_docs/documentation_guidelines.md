# Documentation Guidelines

Guidelines for creating and maintaining documentation optimized for AI Agent consumption.

## Philosophy: AI-First Documentation

Documentation in this codebase is written to be **consumed efficiently by AI agents**.

**Key Constraints:**

1. **Context Window**: ~200K tokens, but "active attention" degrades after ~4K tokens.
2. **Token Efficiency**: ~1 line of markdown ≈ 10-15 tokens.
3. **Retrieval Cost**: Agents read entire files for reasoning (SKILL.md) but use search (grep) for reference (Guidelines).

## Size Standards (The "Golden Ratios")

Adhere strictly to these line limits to ensure AI agents can process files without losing context.

| Document Type     | Optimal Size   | Max Limit  | Action if Exceeded                      |
| ----------------- | -------------- | ---------- | --------------------------------------- |
| **SKILL.md**      | 300-400 lines  | 500 lines  | Extract details to `resources/*.md`     |
| **Resource File** | 200-300 lines  | 400 lines  | Split into thematic files               |
| **Guideline**     | 800-1000 lines | 1200 lines | Modularize into `docs/<topic>/*.md`     |
| **AGENTS.md**     | 400-500 lines  | 600 lines  | Extract sections to specific guidelines |

### The "First-Screen Rule"

**Heuristic**: If an AI agent (or human) needs to scroll more than 2 full screens to grasp the file's intent and core patterns, it is too long for "active reasoning".

---

## File Type Specifications

### 1. Skill Definitions (`SKILL.md`)

**Purpose**: Immediate "working memory" for the agent when performing a specific task.
**Context Strategy**: Read completely 1 time.

**Required Structure**:

```markdown
---
(frontmatter)
---

## Critical Warnings

(20 lines max - only safety/critical constraints)

## When to Use

(15 lines max)

## Critical Patterns

(150-200 lines - The 5-7 most essential patterns only)

## Decision Tree

(30 lines - Logic flow for choosing patterns)

## Resources

(Links to detailed guides in ./resources/)

## Quick Reference

(Cheat sheet)
```

### 2. Resource Files (`resources/*.md`)

**Purpose**: Detailed patterns, examples, and edge cases.
**Context Strategy**: Loaded on-demand via links from SKILL.md.
**Naming Convention**: `ai_docs/skills/<skill-name>/resources/<topic>.md`

**Best Practices**:

- **Granular**: `mocking-rtk-query.md` is better than `all-mocking-patterns.md`.
- **Self-Contained**: Should make sense without reading other files.
- **Example-Heavy**: Focus on code snippets over prose.

### 3. Guidelines (`docs/*_guidelines.md`)

**Purpose**: Comprehensive reference (Testing, Architecture, API).
**Context Strategy**: Search-first (`grep`). The agent should NOT need to read the whole file.

**Requirements**:

- **Clear Headers**: Use `## Header Name` strictly. This allows `grep "## Header Name"` to find sections.
- **Table of Contents**: Essential for navigation.
- **Topic Segregation**: Group related rules clearly.

### 4. Project Root (`AGENTS.md`)

**Purpose**: Project map and "Bootloader" for the agent.
**Context Strategy**: Read completely at session start.

**Must Contain**:

- Project Stack & Overview
- Available Skills Table
- Key High-Level Rules (lint/format/build/test expectations, styling rules)
- Links to all Guidelines

---

## Documentation Directory Structure

```text
docs/
├── AGENTS.md                    # Project Bootloader (Max 600 lines)
├── documentation_guidelines.md  # This file
├── architecture_guidelines.md   # Architecture Reference (Max 1200 lines)
├── development_guidelines.md    # Development Workflows (Max 1200 lines)
└── skills/
    ├── vitest/
    │   ├── SKILL.md             # Quick Reference (Max 500 lines)
    │   └── resources/           # Detailed Patterns (Max 400 lines each)
    │       ├── ant-design-patterns.md
    │       ├── mocking-patterns.md
    │       ├── code-examples.md
    │       └── troubleshooting.md
    ├── redux/
    │   ├── SKILL.md
    │   └── resources/
    └── ant-design/
        └── SKILL.md
```

## Refactoring Triggers

Refactor documentation immediately when:

1.  **SKILL.md > 500 lines**: Move the largest "Critical Pattern" to a resource file.
2.  **Resource > 400 lines**: Identify two distinct topics and split the file.
3.  **Guideline > 1200 lines**: Create a subdirectory `docs/<topic>/` and split into `README.md` + sub-topic files.
4.  **"Strict Mode Violation"**: If you find an agent confusing two patterns, clarify the distinction in the SKILL.md Decision Tree.
