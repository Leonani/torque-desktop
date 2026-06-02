---
name: code-review
description: >
  Provides automated code review based on this repo's standards.
  Trigger: After making changes or when requested to review code/PRs.
license: Apache-2.0
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [root]
  auto_invoke: "Reviewing code"
---

## Critical Warnings

- **DO NOT auto-fix `useEffect` dependencies**: Adding missing dependencies can cause infinite loops and breaking changes. Always flag for manual review.
- **Zero inline styles**: All local styles must use CSS Modules (`*.module.css`).
- **No static AntD methods**: Use hook-based APIs (`useMessage`, `useModal`, `useNotification`).

## When to Use

- Reviewing code changes before committing.
- Preparing a Pull Request (PR).
- Verifying adherence to repo standards in `AGENTS.md`.
- Ensuring React 19, TypeScript, Ant Design 6, and Redux Toolkit/RTK Query patterns are followed correctly.

## Review Mode (Mandatory)

This skill runs in **three phases**:

1. **Review + Plan (default first phase)**
   - Analyze code and list findings.
   - Build a remediation plan with ordered actions and impacted files.
   - Save the remediation plan in `ia_docs/plans/`.
   - Ask the user if they want the modifications applied.
2. **Implementation (only after approval)**
   - Apply only the approved changes.
   - Re-run quality checks.
3. **Final Report (always at the end)**
   - Generate or update the final report in `ia_docs/reports/`.
   - Include findings, actions taken, and pending items.

**Rule**: Never auto-apply fixes before user confirmation.

## Critical Patterns

### Pattern 1: TypeScript-first

- Avoid `any` in new code. Use `unknown` and narrow.
- Prefer small, typed, testable components and utilities.

### Pattern 2: Styling rules (Strict)

- No inline styles in JSX.
- Local styles must use CSS Modules: `*.module.css`.
- Avoid `!important` unless it is the last resort and documented.

### Pattern 3: Ant Design 6 patterns

- Prefer AntD components over custom rebuilds.
- Prefer `ConfigProvider` theme tokens over CSS overrides.
- Prefer hook-based APIs for feedback where applicable (`message.useMessage`, `Modal.useModal`, `notification.useNotification`).

```javascript
// CORRECT
const [messageApi, contextHolder] = message.useMessage();
messageApi.success("Success!");

// INCORRECT
message.success("Success!"); // Static method
```

### Pattern 4: Redux Toolkit + RTK Query

- Use RTK Query for server state; avoid duplicating server state in slices.
- Use tags (`providesTags`/`invalidatesTags`) for coherent caching.

### Pattern 5: Testing (Vitest)

- Use Vitest with Browser Mode (real Chromium).
- When writing/modifying tests, follow the `vitest` skill.

### Pattern 6: React Hooks - useEffect Dependencies (CRITICAL)

**NEVER auto-fix missing dependencies** in `useEffect`. This can cause:

- Infinite loops
- Unintended re-executions
- Breaking changes

**When reviewing `useEffect`**:

1. Check if missing dependencies are intentional (refs, stable values)
2. Analyze if adding dependencies would cause problems
3. **Flag for developer review** - do not auto-apply fixes

See [resources/react-hooks-patterns.md](./resources/react-hooks-patterns.md) for detailed patterns and decision framework.

## Decision Tree

```
Any inline styles? → Move to CSS Modules
Using heavy AntD overrides? → Prefer ConfigProvider tokens
Duplicated server state in slices? → Move to RTK Query
Any unsafe types (`any`)? → Replace with `unknown` + narrowing
useEffect with missing dependencies? → FLAG FOR REVIEW (see resources)
Changed behavior? → Add/adjust tests (Vitest Browser Mode)
```

## Code Review Checklist

1. **TypeScript**: No new `any`; types are explicit where helpful.
2. **Styles**: Zero inline styles; CSS Modules used for local styling.
3. **AntD**: Tokens/hook-based APIs used where applicable.
4. **React Hooks**: Dependency arrays are correct (NEVER auto-fix `useEffect`).
5. **Tone**: "Please" restricted to error messages.
6. **Quality**: lint/format/build/test scripts pass (when present).

## Commands

```bash
# Verify no inline styles
rg "style=\{\{" src/

# Verify no static AntD message calls
rg "\bmessage\.(success|error|warning|info|loading)\b" src/

# Run full project validation
npm run lint && npm run format:check && npm run build
```

## Post-Review Report Generation

**ALWAYS generate the report at the end of the review workflow (phase 3).**
If no modifications are approved, the report must still be generated with findings and pending actions.

### Report Requirements

- **Location**: `ia_docs/reports/`
- **Naming**: snake_case lowercase (e.g., `code_review_2026_02_09.md`, `pr_42_review.md`)
- **Format**: Markdown with clear structure

### Report Template

```markdown
# Code Review Report: [Brief Description]

**Date**: YYYY-MM-DD  
**Files Reviewed**: [List of files]  
**Reviewer**: [Name/Agent]

## Summary

[Brief overview of the review scope and outcome]

## Issues Found

### Critical

- [ ] Issue 1

### Warnings

- [ ] Warning 1

### Suggestions

- [ ] Suggestion 1

## Compliance Checklist

- [ ] TypeScript: No new `any` types
- [ ] Styles: Zero inline styles
- [ ] AntD: Tokens/hook-based APIs used
- [ ] React Hooks: Dependencies reviewed (no auto-fix on useEffect)
- [ ] Tone: "Please" only in error messages
- [ ] Quality: lint/format/build/test pass

## Action Items

1. [Action item with assignee if known]
2. [Next steps]

## Notes

[Additional context or observations]
```

## Resources

- **React Hooks Patterns**: [resources/react-hooks-patterns.md](./resources/react-hooks-patterns.md)
- **Main Guidelines**: [pull_request_guidelines.md](../../pull_request_guidelines.md)
- **Architecture**: [architecture_guidelines.md](../../architecture_guidelines.md)
- **Ant Design Patterns**: [ai_docs/skills/ant-design/SKILL.md](../ant-design/SKILL.md)
- **React 19 Patterns**: [ai_docs/skills/react-19/SKILL.md](../react-19/SKILL.md)
- **TypeScript Patterns**: [ai_docs/skills/typescript/SKILL.md](../typescript/SKILL.md)
- **AGENTS.md**: [AGENTS.md](../../../AGENTS.md)

## Approval Prompt (Required)

After sharing findings and the proposed plan, ask exactly one approval question:

`Do you want me to apply these modifications now?`

## Plan Artifact (Required)

Before requesting approval, save the remediation plan in:

- `ia_docs/plans/`
