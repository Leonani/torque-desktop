# Ant Design Testing Patterns

## Input Components

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

## Select Components (CRITICAL)

Ant Design `Select` components have special considerations:

**Problem**: `page.getByPlaceholder()` doesn't work for Select components because the placeholder is not directly accessible in the DOM.

**✅ CORRECT Pattern**:

```javascript
test("verifies Ant Design Select fields exist", async () => {
  const screen = await render(<MemberForm />);

  // Option 1: Use getByLabelText for the label associated with the Select
  await expect.element(screen.getByLabelText("Role")).toBeInTheDocument();

  // Option 2: Use container.querySelector for more specific selection
  const selectElements = screen.container.querySelectorAll(".ant-select");
  expect(selectElements.length).toBe(2); // Verify count
});

test("handles label/placeholder text conflicts", async () => {
  const screen = await render(<MemberForm />);

  // ❌ WRONG: When label="Member" and placeholder="Input Member",
  // getByText("Member") will match BOTH the label AND the placeholder
  // This causes "strict mode violation: resolved to 2 elements"
  // await expect.element(screen.getByText("Member")).toBeInTheDocument();

  // ✅ CORRECT: Use getByLabelText which is more specific
  await expect.element(screen.getByLabelText("Member")).toBeInTheDocument();
});
```

**Key Points for Ant Design Select**:

1. **Don't use `page.getByPlaceholder()`** - Select placeholders are not accessible until the dropdown is opened
2. **Use `screen.getByLabelText()`** - This works reliably for Form.Item labels
3. **Avoid `screen.getByText()` for labels** - Can match both label and placeholder, causing "strict mode violation"
4. **For complex interactions** - Use `container.querySelector()` with class selectors as a last resort
5. **Keep tests simple** - Focus on verifying the form renders rather than testing dropdown interactions (which are complex in browser mode)

## Table Components

Testing Ant Design `Table` components:

```javascript
test("renders table with data", async () => {
  const screen = await render(<MembersList projectId="project-123" />);

  // Verify table is rendered
  await expect.element(screen.getByRole("table")).toBeInTheDocument();

  // Verify table data is displayed
  await expect
    .element(screen.getByText("user1@example.com"))
    .toBeInTheDocument();
  await expect.element(screen.getByText("developer")).toBeInTheDocument();
});
```

## Icon Components (EditOutlined, DeleteOutlined)

Testing Ant Design Icons using roles:

```javascript
test("renders edit icons for all members", async () => {
  const screen = await render(<MembersList />);

  // Find all edit icons using img role with name matching
  const editIcons = await screen.getByRole("img", { name: /edit/i }).all();
  expect(editIcons.length).toBe(3);
});

test("renders delete buttons conditionally", async () => {
  const screen = await render(<MembersList />);

  // Count delete icons
  const deleteButtons = await page.getByRole("img", { name: /delete/i }).all();
  expect(deleteButtons.length).toBe(2); // Excludes current user
});
```

**Key Points for Icon Testing**:

- Ant Design icons render as `<img>` elements with `role="img"`
- Use `getByRole("img", { name: /icon-name/i })` to select them
- Use `.all()` to get all matching icons and verify counts
- Icon names match the component name (EditOutlined → /edit/i, DeleteOutlined → /delete/i)

## Avoiding Text Ambiguity in Tables (CRITICAL)

When testing tables with data that appears in multiple places, avoid "strict mode violation" errors:

**Problem**: Text fragments that appear in multiple columns cause failures:

```javascript
// Table with:
// - Name column: "John"
// - Email column: "john.doe@example.com"

// ❌ WRONG: "John" matches both the name AND the email
await expect.element(screen.getByText("John")).toBeInTheDocument();
// Error: strict mode violation: resolved to 2 elements:
//   1) <a>John</a> (from Name column)
//   2) <td>john.doe@example.com</td> (contains "john")
```

**✅ CORRECT Solution - Use Unique Identifiers**:

```javascript
test("renders users table with correct data", async () => {
  const screen = await render(<UsersList />);

  // Verify table is rendered
  await expect.element(screen.getByRole("table")).toBeInTheDocument();

  // Use unique identifiers (emails, IDs) instead of names
  await expect
    .element(screen.getByText("john.doe@example.com"))
    .toBeInTheDocument();
  await expect
    .element(screen.getByText("jane.smith@example.com"))
    .toBeInTheDocument();

  // Document why you're avoiding certain text searches
  // Note: Avoiding checking names like "John" or "Doe" as they appear
  // in both the name columns AND within the email addresses,
  // which causes "strict mode violation: resolved to 2 elements"
});
```

**When This Happens**:

- User tables with names and emails (e.g., "John Doe" / "john.doe@email.com")
- Product tables with titles and descriptions
- Any table where data fragments repeat across columns

**Best Practices**:

1. **Prefer unique identifiers** - Use emails, IDs, or other unique values
2. **Document the decision** - Add comments explaining why certain assertions are avoided
3. **Use getByRole for structure** - Verify table structure with `getByRole("table")`
4. **Test unique combinations** - If you must test names, combine with other unique data
