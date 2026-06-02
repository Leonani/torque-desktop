# Vitest Browser Mode - Troubleshooting Guide

Common errors and solutions when testing with Vitest Browser Mode.

---

## render is not a function

**Error**: `render is not a function`

**Solution**: Ensure `vitest-browser-react` is imported in setup file and `setupFiles` is configured in `vitest.config.js`.

**Quick check**:

```javascript
// In src/__tests__/settings/vitest.setup.js
import "vitest-browser-react";
```

```javascript
// In vitest.config.js
test: {
  setupFiles: "./src/__tests__/settings/vitest.setup.js",
}
```

---

## Locator not finding element

**Problem**: Element exists but locator can't find it

**Solutions**:

1. **Check element is rendered**: `console.log(screen.container.innerHTML)`
2. **Use case-insensitive regex**: `screen.getByText(/pattern/i)`
3. **For Ant Design forms**: Use `page.getByPlaceholder()` instead of `screen.getByLabelText()`
4. **For dynamic content**: `await expect.element()` will retry automatically
5. **Verify page vs screen**: Use `page` for placeholders/roles, `screen` for text/labels

---

## "strict mode violation: resolved to 2 elements"

**Error**: `strict mode violation: locator resolved to 2 elements`

### Common Causes

1. **Ambiguous placeholders**: "Password" matches both "Password" and "Confirm Password"
2. **Duplicate text**: Label and placeholder have similar text (e.g., label="Member" and placeholder="Input Member")
3. **Text in multiple columns**: Names appear in both name column AND email addresses (e.g., "John" in name column and "john.doe@example.com")

### Solutions

**For ambiguous placeholders**:

```javascript
// ❌ WRONG: Matches multiple elements
page.getByPlaceholder("Password");

// ✅ CORRECT: Use exact matching
page.getByPlaceholder("Password", { exact: true });
```

**For duplicate text** (Ant Design Select labels):

```javascript
// ❌ WRONG: Text appears in both label and placeholder
screen.getByText("Member"); // Matches label AND placeholder

// ✅ CORRECT: Use getByLabelText which is more specific
screen.getByLabelText("Member"); // Only matches the label

// ✅ ALTERNATIVE: Use specific selectors
screen.container.querySelector('label[for="field_id"]');

// ✅ ALTERNATIVE: Count elements
screen.container.querySelectorAll(".ant-select").length;
```

**For text in multiple table columns** (CRITICAL for tables):

```javascript
// Table displays: Name: "John", Email: "john.doe@example.com"

// ❌ WRONG: "John" appears in name AND email
screen.getByText("John");
// Error: Matches <a>John</a> AND <td>john.doe@example.com</td>

// ✅ CORRECT: Use unique identifiers (emails, IDs)
screen.getByText("john.doe@example.com"); // Only one match

// Add explanatory comment
// Note: Avoiding "John" as it appears in both name and email columns
```

**See**: [ant-design-patterns.md](./ant-design-patterns.md) for detailed table testing patterns.

---

## Test Hangs / Infinite Loop / Maximum Update Depth Exceeded

**Symptoms**:

- Test times out after 15+ seconds
- Browser console shows hundreds of "Warning: Maximum update depth exceeded"
- Component re-renders continuously

**Cause**: RTK Query mock returns new object on every render

**Solution**: Use stable mock with `beforeEach()` and `mockReturnValue()`

```javascript
// ❌ WRONG: Creates new object every render
vi.mock("@/reducer/slices/api", () => ({
  useGetDataQuery: () => ({ data: { items: [] } }), // New object!
}));

// ✅ CORRECT: Stable reference
import { useGetDataQuery } from "@/reducer/slices/api";

vi.mock("@/reducer/slices/api", () => ({
  useGetDataQuery: vi.fn(),
}));

beforeEach(() => {
  const mockData = { data: { items: [] }, isLoading: false };
  useGetDataQuery.mockReturnValue(mockData); // Same object
});
```

**See**: [mocking-patterns.md](./mocking-patterns.md) for detailed RTK Query mocking patterns.

---

## page.locator or screen.locator is not a function

**Error**: `page.locator is not a function` or `screen.locator is not a function`

**Cause**: These methods don't exist in vitest-browser-react (they're Playwright methods)

**Solution**: Use the correct query methods:

```javascript
// ❌ WRONG: Playwright syntax
page.locator('input[placeholder="Email"]');
screen.locator("button");

// ✅ CORRECT: vitest-browser-react syntax
page.getByPlaceholder("Email");
page.getByRole("button", { name: /submit/i });
screen.getByText("Welcome");
```

---

## screen.getByPlaceholder is not a function

**Error**: `screen.getByPlaceholder is not a function`

**Cause**: Placeholders must use `page`, not `screen`

**Solution**:

```javascript
// ❌ WRONG: Using screen for placeholders
const input = screen.getByPlaceholder("Email");

// ✅ CORRECT: Use page for placeholders
const input = page.getByPlaceholder("Email");
```

---

## screen.getAllByRole is not a function

**Error**: `screen.getAllByRole is not a function`

**Cause**: Browser mode doesn't have `getAll*` methods

**Solution**: Use `page` with `.all()`:

```javascript
// ❌ WRONG: getAll* methods don't exist
const items = screen.getAllByRole("menuitem");

// ✅ CORRECT: Use page with .all()
const items = await page.getByRole("menuitem").all();
```

---

## Locator doesn't have .closest() method

**Error**: `locator.closest is not a function`

**Cause**: Locators are not DOM elements

**Solution**: Get the DOM element first with `.element()`:

```javascript
// ❌ WRONG: Locators don't have DOM methods
const parent = screen.getByText("Home").closest("li");

// ✅ CORRECT: Get DOM element first
const element = await screen.getByText("Home").element();
const parent = element.closest("li");
```

---

## page.getByPlaceholder not finding Ant Design Select

**Problem**: `page.getByPlaceholder("Input Role")` times out even though the Select component has that placeholder

**Cause**: Ant Design Select placeholders are not accessible in the DOM until the dropdown is opened

**Solution**: Use `screen.getByLabelText()` instead

```javascript
// ❌ WRONG: Doesn't work for Select components
const roleSelect = page.getByPlaceholder("Input Role");

// ✅ CORRECT: Use label text
await expect.element(screen.getByLabelText("Role")).toBeInTheDocument();

// ✅ ALTERNATIVE: Use class selector
const selectElement = screen.container.querySelector(".ant-select");
expect(selectElement).toBeDefined();
```

**See**: [ant-design-patterns.md](./ant-design-patterns.md) for complete Ant Design testing patterns.

---

## userEvent.fill() doesn't update input value

**Problem**: `userEvent.fill()` doesn't update the input value

**Solutions**:

1. Use locators from `page.getByPlaceholder()` or `screen.getByLabelText()`
2. Never use `querySelector()` results with `userEvent`
3. For Ant Design forms, always use `page.getByPlaceholder()`

```javascript
// ❌ WRONG: Using querySelector with userEvent
const input = screen.container.querySelector('input[name="email"]');
await userEvent.fill(input, "test@example.com"); // Doesn't work

// ✅ CORRECT: Use proper locators
const input = page.getByPlaceholder("Email");
await userEvent.fill(input, "test@example.com"); // Works
```

---

## Import errors

**Problem**: Module not found or path resolution errors

**Solution**:

- Use path aliases from vitest.config.js (`@components`, `@pages`, etc.)
- Ensure all aliases in vitest.config.js match vite.config.js definitions
- Import `render` from `vitest-browser-react`, not `@testing-library/react`

```javascript
// ✅ CORRECT imports
import { render } from "vitest-browser-react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import MyComponent from "@components/MyComponent";
```

---

## Key Differences from @testing-library/react

**CRITICAL**: This project uses `vitest-browser-react`, NOT `@testing-library/react`. The APIs are different:

| Feature            | @testing-library/react (jsdom)                        | vitest-browser-react (Browser Mode)          |
| ------------------ | ----------------------------------------------------- | -------------------------------------------- |
| Render             | `render(<Component />)`                               | `await render(<Component />)`                |
| Import render from | `@testing-library/react`                              | `vitest-browser-react`                       |
| Get screen object  | `import { screen }`                                   | `const screen = await render()`              |
| User events        | `import userEvent from '@testing-library/user-event'` | `import { userEvent } from 'vitest/browser'` |
| Placeholders       | `screen.getByPlaceholder()`                           | `page.getByPlaceholder()`                    |
| Multiple elements  | `screen.getAllByRole()`                               | `await page.getByRole().all()`               |
| Environment        | jsdom (simulated DOM)                                 | Real Chromium browser                        |
| Events             | Simulated JavaScript events                           | Chrome DevTools Protocol (CDP)               |
| act() wrapper      | Often required                                        | Not needed (handled automatically)           |
| Retry behavior     | Limited                                               | Built-in with `expect.element()`             |

---

## Quick Reference: page vs screen

**Use `page` for**:

- Placeholders: `page.getByPlaceholder("Email")`
- Multiple elements: `await page.getByRole("menuitem").all()`
- Role-based queries: `page.getByRole("button", { name: /submit/i })`

**Use `screen` for**:

- Text content: `screen.getByText("Welcome")`
- Labels: `screen.getByLabelText("Name")`
- Other semantic queries when `page` equivalent doesn't work
