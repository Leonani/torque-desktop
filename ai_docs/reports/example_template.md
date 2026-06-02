# Code Review Report: Example Template

**Date**: 2026-02-09  
**Files Reviewed**: `src/components/UserProfile.tsx`, `src/hooks/useAuth.ts`  
**Reviewer**: AI Agent (code-review skill)  

## Summary

Reviewed user profile component and authentication hook for TypeScript compliance, styling patterns, and React hooks best practices. Overall code quality is good with minor suggestions for improvement.

## Issues Found

### Critical
- [ ] None

### Warnings
- [ ] `useAuth.ts:23` - Missing error handling in async function
- [ ] `UserProfile.tsx:45` - Consider memoizing expensive computation

### Suggestions
- [ ] Add JSDoc comments to public hook functions
- [ ] Extract inline validation logic to utility function

## Compliance Checklist

- [x] TypeScript: No new `any` types
- [x] Styles: Zero inline styles
- [x] AntD: Tokens/hook-based APIs used
- [x] React Hooks: Dependencies reviewed (no auto-fix on useEffect)
- [x] Tone: "Please" only in error messages
- [x] Quality: lint/format/build/test pass

## Action Items

1. **@developer** - Add try/catch block in `useAuth.ts:23`
2. **@developer** - Review suggestion for memoization in `UserProfile.tsx`
3. **AI Agent** - Follow up on error handling pattern

## Notes

- useEffect dependency array was intentionally left incomplete per developer request
- All Ant Design patterns follow v6 guidelines
- No breaking changes identified

---

*This report follows the template from `ai_docs/skills/code-review/SKILL.md`*
