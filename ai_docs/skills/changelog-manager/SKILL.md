---
name: changelog-manager
description: >
  Manages and maintains CHANGELOG.md automatically by documenting all commits.
  Trigger: After committing changes, updating changelog, or when preparing releases.
license: Apache-2.0
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [root]
  auto_invoke: "After creating a commit or updating the changelog"
---

## When to Use

- After creating a new commit
- When preparing a release
- When updating project version
- After completing feature work
- When reviewing changes before release

## Critical Patterns

### Changelog Format

Use [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Now removed features

### Fixed
- Bug fixes

### Security
- Security improvements

## [1.0.0] - 2026-02-09
```

### Commit-to-Changelog Mapping

Map conventional commits to changelog sections:

| Commit Type | Changelog Section |
|-------------|-------------------|
| `feat:` | ### Added |
| `fix:` | ### Fixed |
| `docs:` | (skip - not user-facing) |
| `style:` | (skip - not user-facing) |
| `refactor:` | ### Changed |
| `perf:` | ### Changed |
| `test:` | (skip - not user-facing) |
| `chore:` | (skip - not user-facing) |
| `BREAKING CHANGE:` | ### Removed (or new major version) |

### Auto-Update on Commit

**ALWAYS update the changelog after creating a commit:**

1. Parse the commit message
2. Extract the type and description
3. Map to appropriate changelog section
4. Add entry to `[Unreleased]` section
5. Commit the changelog update separately

## Commands

```bash
# View recent commits for changelog
 git log --oneline -20

# View commits since last tag
 git log --oneline $(git describe --tags --abbrev=0)..HEAD

# Check if CHANGELOG.md exists
 test -f CHANGELOG.md && echo "exists" || echo "missing"
```

## Workflow

### After Each Commit

```
1. Parse commit message
2. Determine changelog section
3. Add entry to [Unreleased]
4. Commit as "docs: update changelog"
```

### Before Release

```
1. Review [Unreleased] section
2. Move to new version section
3. Add date (YYYY-MM-DD format)
4. Add version compare link
5. Commit as "docs: prepare release X.Y.Z"
```

## Changelog Location

- **File**: `CHANGELOG.md` (repo root)
- **Unreleased section**: Always at top, above latest version
- **Date format**: ISO 8601 (YYYY-MM-DD)
- **Version format**: Semantic Versioning (MAJOR.MINOR.PATCH)

## Example Entries

```markdown
### Added
- Add user authentication with JWT tokens
- Implement dark mode toggle in settings

### Changed
- Update API response format for consistency
- Refactor database queries for performance

### Fixed
- Resolve login timeout issue on slow connections
- Fix alignment bug in mobile navigation
```

## Integration with Git Commit

This skill works together with the `git-commit` skill:

1. **git-commit**: Creates the commit with conventional message
2. **changelog-manager**: Updates CHANGELOG.md with the change

Always run changelog update AFTER successful commit.

## Resources

- **Format Spec**: [Keep a Changelog](https://keepachangelog.com/)
- **Versioning**: [Semantic Versioning](https://semver.org/)
- **Conventional Commits**: [conventionalcommits.org](https://www.conventionalcommits.org/)
