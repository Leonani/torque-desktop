# React Hooks Review Patterns

Detailed patterns for reviewing React Hooks, with special focus on `useEffect` dependency arrays.

## useEffect Dependency Arrays

### The Golden Rule

**NEVER auto-fix missing dependencies in `useEffect`** without careful analysis.

### Why This Matters

Adding dependencies to `useEffect` can cause:

- **Infinite loops**: If the dependency changes on every render
- **Unintended re-execution**: Side effects running more often than intended
- **Performance degradation**: Expensive operations running unnecessarily
- **Breaking changes**: Altering component behavior in subtle ways

### Review Checklist for useEffect

When you encounter a `useEffect` with missing dependencies:

1. **Understand the intent**:
   - What is the purpose of this effect?
   - When should it run (mount, specific prop changes, etc.)?

2. **Check for intentional omissions**:
   - Is the missing value a ref? (Refs don't need to be in deps)
   - Is it intentional staleness? (e.g., using initial value only)
   - Is it a stable value from outside React? (constants, imports)

3. **Evaluate restructuring options**:
   - Can this logic move to an event handler?
   - Should it use `useMemo`/`useCallback` to stabilize values?
   - Is `useRef` more appropriate for mutable values?

4. **Present options to the developer**:
   - Don't make the change automatically
   - Explain the trade-offs of each option
   - Let the developer decide based on context

### Common Scenarios

#### Scenario 1: Missing dependency that should be added

```javascript
// ⚠️ Missing 'userId' dependency
useEffect(() => {
  fetchUser(userId);
}, []); // userId missing

// Option A: Add the dependency (if data should refetch when userId changes)
useEffect(() => {
  fetchUser(userId);
}, [userId]);

// Option B: Keep empty if this is truly mount-only and userId is constant
// But consider: why is userId a prop if it never changes?
```

**Decision**: Usually Option A is correct, but verify with the developer.

#### Scenario 2: Function reference causing re-runs

```javascript
// ⚠️ handleSave is recreated on every render
useEffect(() => {
  document.addEventListener('keydown', handleSave);
  return () => document.removeEventListener('keydown', handleSave);
}, [handleSave]); // This causes the effect to re-run constantly

// Option A: Use useCallback (if dependencies are stable)
const handleSave = useCallback(() => { ... }, [stableDep]);

// Option B: Use a ref to access the latest function
const handleSaveRef = useRef(handleSave);
useEffect(() => {
  handleSaveRef.current = handleSave;
}, [handleSave]);

useEffect(() => {
  const handler = (e) => handleSaveRef.current(e);
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, []); // No dependencies needed

// Option C: Move to event handler instead of effect
// (Best option if possible)
```

#### Scenario 3: Object/array dependencies

```javascript
// ⚠️ Objects/arrays are recreated every render
useEffect(() => {
  processConfig(config);
}, [config]); // New object reference every time = infinite loop

// Option A: Destructure to primitive values
const { apiUrl, timeout } = config;
useEffect(() => {
  processConfig({ apiUrl, timeout });
}, [apiUrl, timeout]);

// Option B: Use a stable key/id instead of the object
useEffect(() => {
  processConfig(config);
}, [config.id]); // Assuming config has a stable identifier

// Option C: Memoize the config object
const stableConfig = useMemo(() => config, [dep1, dep2]);
useEffect(() => {
  processConfig(stableConfig);
}, [stableConfig]);
```

#### Scenario 4: Intentionally omitting dependencies

```javascript
// ✓ Legitimate case: Using ref to avoid dependency
const isMounted = useRef(true);

useEffect(() => {
  fetchData().then(data => {
    if (isMounted.current) {
      setData(data);
    }
  });
  
  return () => {
    isMounted.current = false;
  };
}, []); // isMount intentionally omitted - it's a ref

// ✓ Legitimate case: Stable callback from context
const { stableCallback } = useContext(MyContext);

useEffect(() => {
  stableCallback(); // This is guaranteed to be stable
}, []); // OK if stableCallback is truly stable (documented in context)
```

### Decision Framework

```
useEffect with missing dependencies?
├── Is the missing value a ref?
│   └── ✓ OK to omit (refs are mutable but stable)
├── Is the missing value a stable import/constant?
│   └── ✓ OK to omit (defined outside component)
├── Is it intentional staleness?
│   ├── Does it cause a bug?
│   │   └── ⚠️ Flag for review
│   └── Document with comment why it's omitted
├── Will adding it cause infinite loops?
│   ├── Can values be stabilized? (useMemo, useCallback)
│   ├── Can effect be restructured?
│   └── ⚠️ Flag for developer decision
└── Should this be in an event handler instead?
    └── ✓ Suggest moving to handler (best practice)
```

### Communication Template

When flagging a useEffect dependency issue, use this format:

```markdown
⚠️ **useEffect Dependency Review Required**

Location: `ComponentName.tsx:42`

**Issue**: Missing dependency `userId` in useEffect dependency array.

**Current Code**:
```javascript
useEffect(() => {
  fetchUser(userId);
}, []);
```

**Options**:
1. **Add `userId` to dependencies**: Data will refetch when userId changes
2. **Keep as-is with comment**: If this is truly mount-only, add `// eslint-disable-next-line react-hooks/exhaustive-deps` with explanation
3. **Move to event handler**: If this should only run on user action, not on mount

**Recommendation**: Option 1 (add dependency) unless there's a specific reason not to.

**Risk if auto-fixed**: Could cause infinite loops if userId changes frequently or if fetchUser triggers a state update that affects userId.
```

## Other Hooks Review Patterns

### useMemo / useCallback

In React 19, these are usually unnecessary. Only use when:

- The computation is expensive (>100ms)
- The reference stability is required (e.g., for `useEffect` deps)
- The child component is optimized and relies on reference equality

### useRef

Appropriate uses:

- Accessing DOM elements
- Storing mutable values that don't trigger re-renders
- Caching values between renders without causing effects to run
- Avoiding stale closures in effects

Inappropriate uses:

- Replacing state (unless intentionally avoiding re-renders)
- Storing derived values that should be computed

### Custom Hooks

Review criteria:

- Does it follow the `useX` naming convention?
- Does it encapsulate reusable logic?
- Are dependencies properly declared?
- Is it tested independently?

## Resources

- [React useEffect Documentation](https://react.dev/reference/react/useEffect)
- [AGENTS.md React Hooks Guidelines](../../../../../AGENTS.md)
- [ESLint react-hooks/exhaustive-deps rule](https://www.npmjs.com/package/eslint-plugin-react-hooks)
