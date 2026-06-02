---
name: code-review
description: >
  Provides automated code review based on Jarvis Web project standards.
  Trigger: After making changes or when requested to review code/PRs.
license: Apache-2.0
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [root]
  auto_invoke: "Reviewing code"
---

## When to Use

Use this skill when:

- Reviewing code changes before committing.
- Preparing a Pull Request (PR).
- Verifying adherence to Jarvis Web coding standards.
- Ensuring React, Ant Design, and Redux patterns are followed correctly.

---

## Critical Patterns

The code MUST strictly follow these rules from `pull_request_guidelines.md`.

### Pattern 1: Path Aliases & Imports

All imports MUST use `@` aliases. No relative imports (`./`, `../`) are allowed.

```javascript
// CORRECT
import BotCard from "@components/Bots/BotCard";
import { useAuth } from "@hooks/useAuth";

// INCORRECT
import BotCard from "../../components/Bots/BotCard";
import { useAuth } from "./hooks/useAuth";
```

### Pattern 2: Component Props (PropTypes)

Every component with props must have `PropTypes` defined. Props must use `.isRequired` unless they have a default value.

```javascript
import PropTypes from "prop-types";

const BotFlow = ({ botId, title = "New Bot" }) => {
  return (
    <div>
      {title}: {botId}
    </div>
  );
};

BotFlow.propTypes = {
  botId: PropTypes.string.isRequired, // Required
  title: PropTypes.string, // Optional because it has a default value
};
```

### Pattern 3: Ant Design Hook APIs

Use Ant Design's hook-based APIs (`useMessage`, `useModal`, `useNotification`) instead of static methods.

```javascript
// CORRECT
const [messageApi, contextHolder] = message.useMessage();
// ...
messageApi.success("Success!");

// INCORRECT
message.success("Success!"); // Static method
```

---

## Decision Tree

```
Are there relative imports? → Replace with @ aliases
Are PropTypes missing/incomplete? → Add PropTypes with .isRequired where needed
Is there inline style={{}}? → Move to CSS Module with snake_case
Static AntD message/modal used? → Convert to hook-based API (useMessage/useModal)
Hooks have missing dependencies? → Add all dependencies to useEffect/useCallback/useMemo
```

---

## Code Review Checklist

Reviewers (and AI) should verify:

1.  **Imports**: Zero relative paths.
2.  **PropTypes**: Defined for all props; `.isRequired` logic is correct.
3.  **Styles**: Zero inline styles; snake_case used in CSS Modules.
4.  **AntD**: Hooks used for feedback components.
5.  **React Hooks**: Complete dependency arrays.
6.  **Tone**: "Please" restricted to error messages.
7.  **Quality**: `npm run lint` and `npm run format:check` pass.

---

## Commands

```bash
# Verify no relative imports remain
grep -r "from ['\"]\.\." src/

# Verify no inline styles
grep -r "style={{" src/

# Verify no static AntD message calls
grep -r "message\.\(success\|error\)" src/

# Run full project validation
npm run lint && npm run format:check && npm run build
```

---

## Resources

- **Main Guidelines**: [pull_request_guidelines.md](../../pull_request_guidelines.md)
- **Architecture**: [architecture_guidelines.md](../../architecture_guidelines.md)
- **Ant Design Patterns**: [docs/skills/antd/SKILL.md](../antd/SKILL.md)
- **React 18 Patterns**: [docs/skills/react-18/SKILL.md](../react-18/SKILL.md)
