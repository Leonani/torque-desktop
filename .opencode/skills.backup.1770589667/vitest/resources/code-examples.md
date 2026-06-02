# Code Examples

## Component Rendering Test

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

## Form with Exact Placeholder Matching

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

## Working with Multiple Elements

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

## Accessing Parent Elements

```jsx
test("highlights active navigation item", async () => {
  const screen = await render(<Navigation currentPath="/home" />);

  // Get element and access its DOM parent
  const homeLink = await screen.getByText("Home").element();
  const parentLi = homeLink.closest("li");

  expect(parentLi.classList.contains("active")).toBe(true);
});
```

## Testing Tables with Text Ambiguity

```jsx
import { render } from "vitest-browser-react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import UsersList from "@components/admin/users/UsersList";

// Mock RTK Query and Redux
vi.mock("react-redux", () => ({ useSelector: vi.fn() }));
vi.mock("@/reducer/slices/users/usersApiSlice", () => ({
  useGetUsersQuery: vi.fn(),
  useSoftDeleteUserMutation: vi.fn(),
}));

test("renders users table avoiding text ambiguity", async () => {
  // Setup mocks
  const { useSelector } = await import("react-redux");
  const { useGetUsersQuery } =
    await import("@/reducer/slices/users/usersApiSlice");

  useSelector.mockImplementation((selector) =>
    selector({ project: { project: { project_id: "123" } } }),
  );

  useGetUsersQuery.mockReturnValue({
    data: {
      users: [
        {
          user_firstname: "John",
          user_lastname: "Doe",
          user_email: "john.doe@example.com",
          user_is_deleted: false,
        },
      ],
    },
    error: null,
    isLoading: false,
  });

  const screen = await render(<UsersList />);

  // ✅ CORRECT: Use unique email instead of "John" or "Doe"
  // "John" would match BOTH the name column AND the email address
  await expect
    .element(screen.getByText("john.doe@example.com"))
    .toBeInTheDocument();

  // Note: Avoiding screen.getByText("John") as it appears in both
  // the name column AND within the email "john.doe@example.com"
});
```

## Redux & Router Wrapper Pattern

```jsx
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";

const TestWrapper = ({ children, store }) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

TestWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  store: PropTypes.object.isRequired,
};

// Usage in tests
test("component with Redux and Router", async () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      project: projectReducer,
    },
  });

  const screen = await render(
    <TestWrapper store={store}>
      <MyComponent />
    </TestWrapper>,
  );

  await expect.element(screen.getByText("Welcome")).toBeInTheDocument();
});
```

## Complete MemberForm Test Pattern

```javascript
import MemberForm from "@components/admin/members/MemberForm.jsx";
import { Form } from "antd";
import PropTypes from "prop-types";
import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";

import { useGetUsersByTenantQuery } from "@/reducer/slices/tenants/tenantApiSlice";

// Mock RTK Query hook
vi.mock("@/reducer/slices/tenants/tenantApiSlice", () => ({
  useGetUsersByTenantQuery: vi.fn(),
}));

vi.mock("@/hooks/useUserContext", () => ({
  useUserContext: () => ({
    tenant: { tenant_id: "test-tenant-123" },
  }),
}));

// Setup stable mock data in beforeEach (prevents infinite loops)
beforeEach(() => {
  const mockData = {
    data: {
      users: [{ user_email: "john.doe@example.com", user_role: "admin" }],
    },
    isLoading: false,
    error: null,
  };
  useGetUsersByTenantQuery.mockReturnValue(mockData);
});

// Create wrapper for Ant Design Form
const MemberFormWrapper = ({ initialValue, edit, onSubmit }) => {
  const [form] = Form.useForm();

  return (
    <MemberForm
      form={form}
      formName="test-member-form"
      initialValue={initialValue}
      edit={edit}
      onSubmit={onSubmit}
    />
  );
};

MemberFormWrapper.propTypes = {
  initialValue: PropTypes.object,
  edit: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
};

test("renders all form fields with user options", async () => {
  const screen = await page.render(<MemberFormWrapper onSubmit={vi.fn()} />);

  // Use getByLabelText for Select fields
  await expect.element(screen.getByLabelText("Member")).toBeInTheDocument();
  await expect.element(screen.getByLabelText("Role")).toBeInTheDocument();
});
```
