# Pull Request Guidelines

Before creating a pull request, ensure your changes adhere to the standards in [AGENTS.md](../AGENTS.md). Use this checklist as a final verification step.

## Verification Checklist

### 1. Code Standards

- [ ] **TypeScript**: No `any` in new code; use `unknown` and narrow.
- [ ] **Imports**: Use consistent import style; prefer aliases when configured; avoid deep `../../..` paths.
- [ ] **Styling**: No inline styles (`style={{ ... }}`). Local styles via CSS Modules (`*.module.css`).
- [ ] **Ant Design 6**: Prefer `ConfigProvider` tokens over CSS overrides; prefer hook-based APIs for feedback.
- [ ] **Redux Toolkit/RTK Query**: Use RTK Query for server state; tags are coherent.

### 2. Logic & React Patterns

- [ ] **Hooks dependencies**: Dependency arrays are correct; do not auto-fix `useEffect` dependencies (review manually to avoid infinite loops).
- [ ] **React 19**: Avoid premature `useMemo`/`useCallback`; keep code idiomatic and readable.
- [ ] **Tone**: "Please" is used ONLY in error messages. Validation and placeholders are direct.

### 3. Quality Assurance

- [ ] **Linting**: `npm run lint` passes with 0 warnings.
- [ ] **Formatting**: `npm run format:check` passes (or ran `npm run format`).
- [ ] **Build**: `npm run build` completes without errors.
- [ ] **Tests**: Relevant tests pass (run `npm run test` or `npm run test:ci`).

## Common Verification Commands

```bash
# Check for inline styles
rg "style=\{\{" src/

# Check for static AntD message calls (prefer hook APIs)
rg "\bmessage\.(success|error|warning|info|loading)\b" src/

# Verify project scripts (if present)
npm run lint && npm run format:check && npm run build
```

## Code Review Reports

If you performed a code review, ensure a report was generated in `ai_docs/reports/`:

- **Naming**: snake_case lowercase (e.g., `code_review_2026_02_09.md`, `pr_42_review.md`)
- **Template**: Use the template from [code-review skill](skills/code-review/SKILL.md)

## How to Submit

1. Ensure your branch is up to date with `aut-develop`.
2. Squash commits if necessary for a clean history.
3. Provide a clear summary in the PR description of "what" changed and "why".
4. If a code review report exists, reference it in the PR description.
