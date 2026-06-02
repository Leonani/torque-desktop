# Mocking Patterns

## RTK Query Mocking (CRITICAL for Infinite Loop Prevention)

When mocking RTK Query hooks, you MUST ensure the mock returns a stable reference to prevent infinite re-renders:

**❌ WRONG - Causes Infinite Loop**:

```javascript
vi.mock("@/reducer/slices/tenants/tenantApiSlice", () => ({
  useGetUsersByTenantQuery: () => ({
    data: { users: [...] }, // New object every render!
    isLoading: false,
  }),
}));
```

**✅ CORRECT - Stable Mock with beforeEach**:

```javascript
import { beforeEach, expect, test, vi } from "vitest";
import { useGetUsersByTenantQuery } from "@/reducer/slices/tenants/tenantApiSlice";

// Step 1: Mock the hook as vi.fn()
vi.mock("@/reducer/slices/tenants/tenantApiSlice", () => ({
  useGetUsersByTenantQuery: vi.fn(),
}));

// Step 2: Configure stable return value in beforeEach
beforeEach(() => {
  const mockData = {
    data: {
      users: [
        { user_email: "john@example.com", user_role: "admin" },
        { user_email: "jane@example.com", user_role: "developer" },
      ],
    },
    isLoading: false,
    error: null,
  };

  // This ensures the same object reference is returned every time
  useGetUsersByTenantQuery.mockReturnValue(mockData);
});

test("component renders with RTK Query data", async () => {
  const screen = await render(<MemberForm onSubmit={vi.fn()} />);
  // Test proceeds without infinite loop
});
```

**Why This Pattern?**

- RTK Query hooks trigger `useEffect` when the returned data reference changes
- Returning a new object on every render causes infinite re-renders
- Using `beforeEach` with `mockReturnValue` ensures the same object reference
- This is the standard pattern used throughout the codebase (see ContextProvider.test.jsx)

## Redux useSelector Mocking

When testing components that use Redux `useSelector`, mock it and configure its implementation:

```javascript
import { useSelector } from "react-redux";

// Step 1: Mock react-redux
vi.mock("react-redux", () => ({
  useSelector: vi.fn(),
}));

// Step 2: Configure mock implementation in beforeEach
beforeEach(() => {
  useSelector.mockImplementation((selector) => {
    const state = {
      project: {
        project: {
          project_id: "project-123",
          project_role: "admin",
        },
        projects: [],
      },
    };
    return selector(state);
  });
});

test("component uses Redux state", async () => {
  const screen = await render(<MembersList projectId="project-123" />);
  // Component receives state from mocked useSelector
});
```

## Mocking Child Components

To simplify tests and avoid testing nested component logic, mock child components:

```javascript
// Mock MemberEdit to avoid its complex logic in parent tests
vi.mock("@components/admin/members/MemberEdit", () => ({
  default: () => <div>MemberEdit Component</div>,
}));

test("renders child component", async () => {
  const screen = await render(<MembersList />);

  // Verify the mocked child component is rendered
  await expect
    .element(screen.getByText("MemberEdit Component"))
    .toBeInTheDocument();
});
```

**When to Mock Child Components**:

- Testing parent component logic in isolation
- Child component has complex setup (forms, modals, API calls)
- Child component is tested separately in its own test file
- Faster test execution

## Context Hooks Mocking

```javascript
vi.mock("@/hooks/useUserContext", () => ({
  useUserContext: () => ({
    tenant: {
      tenant_id: "test-tenant-123",
      user_email: "admin@example.com",
    },
  }),
}));
```

## Multiple RTK Query Hooks

```javascript
import { useGetBotsQuery } from "@/reducer/slices/botsApiSlice";
import { useGetProjectsQuery } from "@/reducer/slices/projectsApiSlice";

vi.mock("@/reducer/slices/botsApiSlice", () => ({
  useGetBotsQuery: vi.fn(),
}));

vi.mock("@/reducer/slices/projectsApiSlice", () => ({
  useGetProjectsQuery: vi.fn(),
}));

beforeEach(() => {
  const mockBotsData = { data: { bots: [...] }, isLoading: false };
  const mockProjectsData = { data: { projects: [...] }, isLoading: false };

  useGetBotsQuery.mockReturnValue(mockBotsData);
  useGetProjectsQuery.mockReturnValue(mockProjectsData);
});
```

## Per-Test Mock Customization

```javascript
beforeEach(() => {
  // Default mock
  useGetUsersByTenantQuery.mockReturnValue({
    data: { users: [] },
    isLoading: false,
    error: null,
  });
});

test("handles loading state", async () => {
  // Override for this specific test
  useGetUsersByTenantQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    error: null,
  });

  const screen = await render(<MemberForm />);
  await expect.element(screen.getByText(/loading/i)).toBeInTheDocument();
});
```
