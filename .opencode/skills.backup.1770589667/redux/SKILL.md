---
name: redux
description: >
  Redux Toolkit and RTK Query patterns for Jarvis Web.
  Trigger: When modifying state management, API slices, or using hooks like useSelector/useDispatch.
license: Apache-2.0
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [root, state]
  auto_invoke: "Modifying Redux store/slices"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, WebFetch, Task
---

## When to Use

Use this skill when:

- Creating or modifying slices with `createSlice`.
- Defining API endpoints using `injectEndpoints` in RTK Query.
- Selecting data from the store with `useSelector` or selectors.
- Dispatching actions with `useDispatch`.
- Handling complex side effects or global state.

---

## Critical Patterns

### 1. RTK Query: injectEndpoints (MANDATORY)

Do NOT create new base APIs. Use the `injectEndpoints` pattern to extend the existing `apiSlice`.

```javascript
import { apiSlice } from "@reducer/apis/apiSlice";

export const featureApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFeatureData: builder.query({
      query: (id) => `/feature/${id}`,
      providesTags: ["FeatureTag"],
    }),
    updateFeature: builder.mutation({
      query: (data) => ({
        url: "/feature",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["FeatureTag"],
    }),
  }),
});

export const { useGetFeatureDataQuery, useUpdateFeatureMutation } =
  featureApiSlice;
```

### 2. Slices & Matchers

Use `createSlice` for local UI state that isn't handled by RTK Query cache. Use `extraReducers` with `.addMatcher` to respond to API lifecycle events (Pending, Fulfilled, Rejected).

```javascript
const mySlice = createSlice({
  name: "myFeature",
  initialState,
  reducers: {
    setLocalState: (state, action) => {
      state.value = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      featureApiSlice.endpoints.getFeatureData.matchFulfilled,
      (state, action) => {
        state.lastUpdated = Date.now();
      },
    );
  },
});
```

### 3. Selectors

Export selectors from slice files to keep state access centralized and refactor-friendly.

```javascript
export const selectFeatureValue = (state) => state.myFeature.value;
```

---

## Decision Tree

```
Is it server data?     → RTK Query (apiSlice.injectEndpoints)
Is it global UI state? → Redux Slice (createSlice)
Is it local UI state?  → React useState
Need data in view?     → useQuery hook or useSelector
```

---

## Code Examples

### Example: Using RTK Query in a Component

```jsx
import { useGetBotsQuery } from "@reducer/slices/botsApiSlice";

const BotList = () => {
  const { data: bots, isLoading, error } = useGetBotsQuery(tenantId);

  if (isLoading) return <Spin />;
  return <div>{/* Render bots */}</div>;
};
```

### Example: Programmatic Dispatch

```jsx
import { useDispatch } from "react-redux";
import { logoutUser } from "@reducer/slices/auth";

const LogoutButton = () => {
  const dispatch = useDispatch();
  return <Button onClick={() => dispatch(logoutUser())}>Logout</Button>;
};
```

---

## Commands

```bash
# No specific Redux commands, but ensure linting passes
npm run lint
```

---

## Resources

- [Official Redux Toolkit Docs](https://redux-toolkit.js.org/)
- [RTK Query Guide](https://redux-toolkit.js.org/rtk-query/overview)
- [React Redux Hooks](https://react-redux.js.org/api/hooks)
