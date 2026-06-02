---
name: vitest
description: >
  Testing patterns using Vitest Browser Mode ONLY (NOT jsdom).
  MANDATORY: All tests MUST use vitest-browser-react with real Chromium browser.
  Trigger: When writing or modifying tests in src/__tests__ or creating new test files.
license: Apache-2.0
metadata:
  author: Jose Limardo
  version: "2.0"
  scope: [root, test]
  auto_invoke: "Writing or modifying tests"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, WebFetch, Task
---

## ⚠️ CRITICAL: Browser Mode Only

**MANDATORY**: This project uses **Vitest Browser Mode** with a real Chromium browser - NOT jsdom.

**DO NOT** use:

- `@testing-library/react` - Use `vitest-browser-react` instead
- jsdom environment - Tests run in real Chromium
- Simulated events - Uses Chrome DevTools Protocol (CDP)

**Why Browser Mode?**

- Real browser environment (Chromium via Playwright)
- Accurate DOM testing with CDP
- Better Ant Design component compatibility
- Catches browser-specific issues early
- More reliable user interaction simulation

---

## When to Use

Use this skill when:

- Writing unit tests for components or hooks
- Implementing integration tests for Redux flows
- Mocking modules or API responses using `vi.mock`
- Testing DOM interactions in a real browser environment
- **ALWAYS when writing or modifying tests** - this is the only supported testing approach

---

## Critical Patterns

### 1. Test Environment (MANDATORY)

**ALWAYS use these imports - Browser Mode ONLY:**

```javascript
import { render } from "vitest-browser-react"; // NOT @testing-library/react
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
```

**Key Points**:

- Import `render` from `vitest-browser-react` (NOT `@testing-library/react`)
- Always `await render()` - it's asynchronous in browser mode
- Use `page` for placeholders and roles
- Use `screen` (returned by render) for text and labels

### 2. Rendering Components

**MANDATORY Pattern**:

```javascript
import { render } from "vitest-browser-react";

test("component renders", async () => {
  const screen = await render(<MyComponent />);
  await expect.element(screen.getByText("Hello")).toBeInTheDocument();
});
```

**DO NOT** use `page.render()` - that's old syntax. Use `render()` from `vitest-browser-react`.

### 3. Using page vs screen

**Use `page` for**:

- Placeholders: `page.getByPlaceholder("Email")`
- Roles: `page.getByRole("button", { name: /submit/i })`
- Multiple elements: `await page.getByRole("menuitem").all()`

**Use `screen` for**:

- Text content: `screen.getByText("Welcome")`
- Labels: `screen.getByLabelText("Name")`

```javascript
test("demonstrates page vs screen", async () => {
  const screen = await render(<LoginForm />);

  // ✅ CORRECT: Use page for placeholders
  const emailInput = page.getByPlaceholder("Email");

  // ✅ CORRECT: Use screen for text
  const heading = screen.getByText("Login");

  // ❌ WRONG: Don't use screen for placeholders
  // const input = screen.getByPlaceholder("Email"); // Error!
});
```

### 4. Ant Design Testing

Ant Design components require specific selection strategies:

```javascript
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";

test("handles Ant Design inputs", async () => {
  const screen = await render(<AntdForm />);

  // ✅ CORRECT: Use page.getByPlaceholder for Ant Design inputs
  const emailInput = page.getByPlaceholder("Email");
  await userEvent.fill(emailInput, "test@example.com");

  // ✅ CORRECT: Use exact matching for ambiguous placeholders
  const passwordInput = page.getByPlaceholder("Password", { exact: true });
  await userEvent.fill(passwordInput, "secret123");
});
```

**For detailed Ant Design patterns** (Select, Table, Icon components), see [Ant Design Patterns](./resources/ant-design-patterns.md).

### 5. Redux & Router Wrappers

Always wrap components that use Redux or React Router in a `TestWrapper` with a mocked store.

```jsx
const TestWrapper = ({ children, store }) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);
```

### 6. Mocking

Use `vi.mock` at the top level to mock hooks or external modules.

```javascript
vi.mock("@hooks/useUserContext", () => ({
  useUserContext: () => ({ isLoggedIn: true }),
}));
```

**⚠️ CRITICAL for RTK Query**: Always use stable mock references with `beforeEach` to prevent infinite loops:

```javascript
import { useGetDataQuery } from "@/api";

vi.mock("@/api", () => ({
  useGetDataQuery: vi.fn(),
}));

beforeEach(() => {
  const mockData = { data: { items: [] }, isLoading: false };
  useGetDataQuery.mockReturnValue(mockData); // Stable reference!
});
```

**For detailed mocking patterns** (RTK Query, Redux useSelector, child components), see [Mocking Patterns](./resources/mocking-patterns.md).

### 7. Working with Multiple Elements

For elements that match multiple times, use **page locators with `.all()`**:

```javascript
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

test("gets all menu items", async () => {
  const screen = await render(<Navigation />);

  // ✅ CORRECT: Use page with .all()
  const menuItems = await page.getByRole("menuitem").all();
  expect(menuItems).toHaveLength(3);

  // Working with a specific element from the array
  await menuItems[0].click();

  // ❌ WRONG: screen.getAllByRole doesn't exist
  // const items = screen.getAllByRole("menuitem"); // Error!
});
```

### 8. Exact Matching for Placeholders

When placeholders could match multiple fields (e.g., "Password" vs "Confirm Password"), use `{ exact: true }`:

```javascript
test("handles ambiguous placeholders", async () => {
  const screen = await render(<RegisterForm />);

  // ❌ WRONG: Matches both "Password" AND "Confirm Password"
  // const pwd = page.getByPlaceholder("Password"); // Error!

  // ✅ CORRECT: Use exact matching
  const passwordInput = page.getByPlaceholder("Password", { exact: true });
  const confirmInput = page.getByPlaceholder("Confirm Password");

  await userEvent.fill(passwordInput, "secret123");
  await userEvent.fill(confirmInput, "secret123");
});
```

### 9. Accessing DOM Elements

When you need to use DOM methods like `.closest()`, get the actual DOM element from the locator:

```javascript
test("accesses parent elements", async () => {
  const screen = await render(<Navigation currentPath="/home" />);

  // ✅ CORRECT: Get DOM element first
  const element = await screen.getByText("Home").element();
  const parentLi = element.closest("li");
  expect(parentLi.classList.contains("active")).toBe(true);

  // ❌ WRONG: Locators don't have .closest()
  // const parent = screen.getByText("Home").closest("li"); // Error!
});
```

### 10. Avoiding Text Ambiguity in Tables (CRITICAL)

When testing tables, be careful of text that appears in multiple places (e.g., "John" in both name column AND email "john@example.com"):

```javascript
test("verifies table data without ambiguity", async () => {
  const screen = await render(<UsersList />);

  // ❌ WRONG: "John" appears in both name AND email columns
  // await expect.element(screen.getByText("John")).toBeInTheDocument(); // Error: 2 elements!

  // ✅ CORRECT: Use unique identifiers like full emails
  await expect
    .element(screen.getByText("john.doe@example.com"))
    .toBeInTheDocument();

  // ✅ CORRECT: Use role-based queries for full table cells
  const nameCell = await screen.getByRole("cell", { name: "John Doe" });
});
```

**Key Points**:

- Text fragments that appear in multiple cells cause "strict mode violation: resolved to 2+ elements"
- Prefer unique identifiers (emails, IDs) over partial name matches
- Document why certain assertions are avoided (e.g., `// Don't use "John" - appears in email too`)

For more examples, see [Ant Design Patterns - Text Ambiguity](./resources/ant-design-patterns.md#text-ambiguity-in-tables).

---

## Decision Tree

```
Writing a test?                → ALWAYS use Browser Mode (vitest-browser-react)
Testing a UI component?        → render() from vitest-browser-react + page/screen locators
Testing logic/hooks?           → vitest (unit tests)
Need placeholder selector?     → page.getByPlaceholder()
Need role selector?            → page.getByRole()
Need text selector?            → screen.getByText()
Need multiple elements?        → await page.getByRole().all()
Need to simulate input?        → userEvent.fill() / userEvent.click()
Need DOM method (.closest)?    → await locator.element() first
Checking DOM state?            → await expect.element(...).toBeInTheDocument()
Ambiguous placeholder?         → page.getByPlaceholder("Text", { exact: true })
```

---

## Code Examples

### Example: Component Rendering Test

```jsx
import { render } from "vitest-browser-react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";

test("renders correctly", async () => {
  const store = createTestStore();
  const screen = await render(
    <TestWrapper store={store}>
      <MyComponent />
    </TestWrapper>,
  );

  await expect.element(screen.getByText("Expected Text")).toBeInTheDocument();
});
```

### Example: Form with Exact Placeholder Matching

```jsx
test("handles password fields correctly", async () => {
  const screen = await render(<RegisterForm />);

  // Use exact match to avoid confusion between "Password" and "Confirm Password"
  const passwordInput = page.getByPlaceholder("Password", { exact: true });
  const confirmInput = page.getByPlaceholder("Confirm Password");

  await userEvent.fill(passwordInput, "Secret123!");
  await userEvent.fill(confirmInput, "Secret123!");

  await expect.element(passwordInput).toBeInTheDocument();
});
```

### Example: Working with Multiple Elements

```jsx
test("navigation has correct number of menu items", async () => {
  const screen = await render(<Navigation />);

  // Get all menu items
  const menuItems = await page.getByRole("menuitem").all();

  // Verify count
  expect(menuItems).toHaveLength(3);

  // Click first item
  await menuItems[0].click();
});
```

### Example: Accessing Parent Elements

```jsx
test("highlights active navigation item", async () => {
  const screen = await render(<Navigation currentPath="/home" />);

  // Get element and access its DOM parent
  const homeLink = await screen.getByText("Home").element();
  const parentLi = homeLink.closest("li");

  expect(parentLi.classList.contains("active")).toBe(true);
});
```

---

## Commands

```bash
npm run test             # Run tests in watch mode (visible browser)
npm run test:ci          # Run tests headless (CI/CD)
npm run test:file <path> # Run specific test file
```

---

## Common Migration Issues (jsdom → Browser Mode)

### 1. Import Changes Required

**Before (jsdom)**:

```javascript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
```

**After (Browser Mode)**:

```javascript
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
```

### 2. Render Must Be Awaited

**Before**: `const screen = render(<Component />)`  
**After**: `const screen = await render(<Component />)`

### 3. Placeholder Ambiguity

**Problem**: `page.getByPlaceholder("Password")` matches both "Password" AND "Confirm Password"

**Solution**: Use exact matching

```javascript
page.getByPlaceholder("Password", { exact: true });
```

### 4. No screen.getAllByRole()

**Problem**: `screen.getAllByRole()` doesn't exist in browser mode

**Solution**: Use page locator with `.all()`

```javascript
const items = await page.getByRole("menuitem").all();
```

### 5. Locators Don't Have .closest()

**Problem**: `locator.closest("div")` throws error

**Solution**: Get the DOM element first

```javascript
const element = await locator.element();
const parent = element.closest("div");
```

---

## Resources

### Detailed Pattern Guides

- [Ant Design Testing Patterns](./resources/ant-design-patterns.md) - Select, Table, Icon components, text ambiguity
- [Mocking Patterns](./resources/mocking-patterns.md) - RTK Query, Redux useSelector, child components
- [Complete Code Examples](./resources/code-examples.md) - Full working test examples

### Official Documentation

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Browser Mode](https://vitest.dev/guide/browser/)

---

## Quick Reference

### Essential Imports (Copy-Paste Template)

```javascript
import { render } from "vitest-browser-react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
```

### Common Patterns Cheat Sheet

```javascript
// Render component
const screen = await render(<Component />);

// Get elements - use page for placeholders/roles
const input = page.getByPlaceholder("Email");
const button = page.getByRole("button", { name: /submit/i });
const heading = screen.getByText("Welcome");

// Exact matching for ambiguous placeholders
const pwd = page.getByPlaceholder("Password", { exact: true });

// Multiple elements
const items = await page.getByRole("menuitem").all();

// User interactions
await userEvent.fill(input, "test@example.com");
await button.click();

// Assertions
await expect.element(heading).toBeInTheDocument();

// DOM element access
const element = await screen.getByText("Home").element();
const parent = element.closest("li");
```

### Common Mistakes to Avoid

```javascript
// ❌ WRONG
import { render } from "@testing-library/react";
const screen = render(<Component />);
const input = screen.getByPlaceholder("Email");
const items = screen.getAllByRole("menuitem");
const parent = locator.closest("li");

// ✅ CORRECT
import { render } from "vitest-browser-react";
const screen = await render(<Component />);
const input = page.getByPlaceholder("Email");
const items = await page.getByRole("menuitem").all();
const element = await locator.element();
const parent = element.closest("li");
```

---

## Additional Resources

For detailed patterns and troubleshooting:

- **[Ant Design Patterns](./resources/ant-design-patterns.md)** - Testing Ant Design components (Forms, Tables, Select, Icons)
- **[Mocking Patterns](./resources/mocking-patterns.md)** - RTK Query hooks, Redux, Context, child components
- **[Code Examples](./resources/code-examples.md)** - Complete test examples from the codebase
- **[Troubleshooting](./resources/troubleshooting.md)** - Common errors and solutions
