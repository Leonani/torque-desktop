---
name: redux
description: >
  Redux Toolkit and RTK Query patterns for this repo.
  Trigger: When modifying state management, API slices, or using hooks like useSelector/useDispatch.
license: Apache-2.0
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [root]
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

### 1. RTK Query: centralize the API boundary (MANDATORY)

Prefer a small number of `createApi` instances per backend/domain, with a centralized `baseQuery` for auth headers and error handling.

```ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers) => {
      // attach auth headers here when needed
      return headers;
    },
  }),
  tagTypes: ["Feature"],
  endpoints: (builder) => ({
    getFeature: builder.query<{ id: string; name: string }, string>({
      query: (id) => `/feature/${id}`,
      providesTags: (result, error, id) => [{ type: "Feature", id }],
    }),
    updateFeature: builder.mutation<void, { id: string; name: string }>({
      query: (body) => ({ url: "/feature", method: "POST", body }),
      invalidatesTags: (result, error, body) => [{ type: "Feature", id: body.id }],
    }),
  }),
});
```

### 2. Slices: UI/local state only

Use `createSlice` for local UI state that isn't modeled well by RTK Query cache. Prefer selectors and typed actions.

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
