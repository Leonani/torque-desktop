# Development Workflows

This guide covers development workflows, best practices, and common tasks for this React 19 + Vite + TypeScript frontend.

## Table of Contents

- [Development Workflow](#development-workflow)
- [Code Quality Standards](#code-quality-standards)
- [Git Workflow](#git-workflow)
- [Environment Variables](#environment-variables)
- [Debugging & Troubleshooting](#debugging--troubleshooting)

## Quick Reference

- **Source of truth**: See [AGENTS.md](../AGENTS.md) for stack, rules, and project conventions
- **Skills**: See `## Available Skills` in [AGENTS.md](../AGENTS.md)

---

## Development Workflow

1. **Feature/Bug Selection**: Pick a task from the backlog.
2. **Local Setup**: Configure environment variables as needed (`.env.local`, `.env.development`).
3. **Implementation**: Follow patterns in [AGENTS.md](../AGENTS.md) (TypeScript-first, Ant Design 6, Redux Toolkit/RTK Query, CSS Modules).
4. **Verification**: Run the repo's lint/format/build/test scripts.
5. **Documentation**: Document non-obvious logic and decisions (prefer small, targeted notes).
6. **Review**: Submit PR following the [Pull Request Guidelines](./pull_request_guidelines.md).

## Code Quality Standards

For detailed patterns, use the skills system (`/skill <name>`):

- **React Components**: `/skill react-19` - React 19 patterns (React Compiler guidance)
- **TypeScript**: `/skill typescript` - typing patterns and safe narrowing
- **Ant Design**: `/skill ant-design` - Ant Design 6 ecosystem patterns
- **Redux/RTK Query**: `/skill redux` - Slices, endpoints, selectors
- **Testing**: `/skill vitest` - Browser mode, mocking, assertions
- **Review**: `/skill code-review` - repo standards and verification checklist

### Line Endings

Avoid mixed line endings within the same file. Prefer stable diffs over mass conversion (especially on Windows).

## Git Workflow

- **Branch Naming**: `feature/`, `fix/`, `refactor/`.
- **Commits**: Conventional, descriptive, imperative (e.g., `fix(auth): handle expired session`).
- **Before commit**: run lint/format checks and make sure the build/tests still pass for the affected area.

## Environment Variables

- Prefer `VITE_`-prefixed variables for Vite.
- Document any required variables in the relevant feature README (or in `AGENTS.md` if global).

## Debugging & Troubleshooting

- **Redux DevTools**: Inspect RTK Query cache + slice state.
- **Network**: Use browser DevTools to inspect requests/responses.
- **Reset**: If dependency state is broken, remove `node_modules` and reinstall (use OS-appropriate commands).
