---
name: vite-init
description: >
  Initializes a new Vite project with React and JavaScript.
  Trigger: When the user asks to "scaffold a new project", "initialize a vite app", or "start a new react project".
license: Apache-2.0
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [root]
  auto_invoke: "Scaffolding new Vite projects"
---

## When to Use

- Starting a new React application from scratch.
- Creating a prototype or a separate service within the ecosystem.
- When you need a modern, fast development environment for React.

## Critical Patterns

- **Root Entry**: `index.html` is the entry point, not just a static asset.
- **Modern Browsers**: Vite targets modern browsers by default (`esnext` in dev).
- **Environment Variables**: Use `import.meta.env` instead of `process.env`.
- **Path Aliases**: Configure `vite.config.js` and ensure absolute paths are used for better maintainability.

## Code Examples

### Basic Vite Config (React)

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
```

### Environment Variables

```javascript
// Accessing env variables
const apiUrl = import.meta.env.VITE_API_URL;
```

## Commands

```bash
# Scaffold a new project interactively
npm create vite@latest

# Scaffold a React JavaScript project directly
npm create vite@latest my-react-app -- --template react

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Resources

- **Documentation**: [Vite Official Guide](https://vite.dev/guide/)
- **Local Patterns**: See [AGENTS.md](../../../AGENTS.md) for project-specific React/Vite conventions.
