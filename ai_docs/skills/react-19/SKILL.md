---
name: react-19
description: >
  React 19 patterns with React Compiler.
  Trigger: When writing React components - no useMemo/useCallback needed.
license: Apache-2.0
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [root, ui]
  auto_invoke: "Writing React 19 components/hooks"
---

## No Manual Memoization (REQUIRED)

```typescript
// ✅ React Compiler handles optimization automatically
function Component({ items }) {
  const filtered = items.filter(x => x.active);
  const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));

  const handleClick = (id) => {
    console.log(id);
  };

  return <List items={sorted} onClick={handleClick} />;
}

// ❌ NEVER: Manual memoization
const filtered = useMemo(() => items.filter(x => x.active), [items]);
const handleClick = useCallback((id) => console.log(id), []);
```

## Imports (REQUIRED)

```typescript
// ✅ ALWAYS: Named imports
import { useState, useEffect, useRef } from "react";

// ❌ NEVER
import React from "react";
import * as React from "react";
```

## Server Components First

```typescript
// ✅ Server Component (default) - no directive
export default async function Page() {
  const data = await fetchData();
  return <ClientComponent data={data} />;
}

// ✅ Client Component - only when needed
"use client";
export function Interactive() {
  const [state, setState] = useState(false);
  return <button onClick={() => setState(!state)}>Toggle</button>;
}
```

## When to use "use client"

- useState, useEffect, useRef, useContext
- Event handlers (onClick, onChange)
- Browser APIs (window, localStorage)

## use() Hook

```typescript
import { use } from "react";

// Read promises (suspends until resolved)
function Comments({ promise }) {
  const comments = use(promise);
  return comments.map(c => <div key={c.id}>{c.text}</div>);
}

// Conditional context (not possible with useContext!)
function Theme({ showTheme }) {
  if (showTheme) {
    const theme = use(ThemeContext);
    return <div style={{ color: theme.primary }}>Themed</div>;
  }
  return <div>Plain</div>;
}
```

## Actions & useActionState

```typescript
"use server";
async function submitForm(formData: FormData) {
  await saveToDatabase(formData);
  revalidatePath("/");
}

// With pending state
import { useActionState } from "react";

function Form() {
  const [state, action, isPending] = useActionState(submitForm, null);
  return (
    <form action={action}>
      <button disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

## ref as Prop (No forwardRef)

```typescript
// ✅ React 19: ref is just a prop
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

// ❌ Old way (unnecessary now)
const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);
```

## Lazy Loading

Use React.lazy + Suspense for code-splitting:

```typescript
import { lazy, Suspense } from "react";

// ✅ Good candidates for lazy loading:
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/reports" element={<Reports />} />
  </Routes>
</Suspense>

// ❌ NEVER: These will cause blank screens or poor UX
const Navbar = lazy(() => import('./Navbar')); // Above-the-fold
const Button = lazy(() => import('./Button')); // Small component
const Header = lazy(() => import('./Header')); // Critical above-the-fold
```

**NEVER lazy load:**
- Navbar, Header, Footer, Main Home, Sidebar (above-the-fold)
- Small reusable components (Buttons, Inputs, Cards, Typography)
- Critical components visible on initial render

### Decision Matrix

| Criteria                      | Lazy Load? | Direct Import |
| ----------------------------- | :--------: | :-----------: |
| Is it a route?                |     ✅     |       ❌      |
| Is it a modal?                |     ✅     |       ❌      |
| Uses heavy libraries?         |     ✅     |       ❌      |
| Is it layout/base?            |     ❌     |       ✅      |
| Is it small and commonly used? |    ❌     |       ✅      |
| Always renders on page load?  |     ❌     |       ✅      |

Requirements when using lazy loading:
- Always wrap with `<Suspense>` with a loading fallback
- Consider adding ErrorBoundary for graceful failure
- Monitor bundle size to verify actual benefit

## Keywords

react, react 19, compiler, useMemo, useCallback, server components, use hook
