---
name: antd
description: >
  Ant Design 5 patterns for Jarvis Web.
  Trigger: When writing or modifying React components that use "antd".
license: Apache-2.0
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [root, ui]
  auto_invoke: "Writing React components using Ant Design"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, WebFetch, Task
---

## When to Use

Use this skill when:

- Importing components from "antd".
- Implementing Forms, Modals, Tables, or Messages.
- Handling UI layouts using Row, Col, or Space.

---

## Critical Patterns

### 1. Hook-based APIs (MANDATORY)

Never use static methods like `message.success()` or `Modal.confirm()`. They do not inherit context (like themes or locales). Always use the hook-based alternatives.

```jsx
import { message, Modal } from "antd";

const MyComponent = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const handleAction = () => {
    messageApi.success("Operation successful!");
    modalApi.confirm({ title: "Are you sure?", onOk: () => {} });
  };

  return (
    <>
      {contextHolder}
      {modalContextHolder}
      <button onClick={handleAction}>Action</button>
    </>
  );
};
```

### 2. No Inline Styles

Prohibited: `style={{ marginTop: 16 }}`.
Required: Use CSS Modules with `snake_case` class names.

```jsx
// MyComponent.jsx
import styles from "./MyComponent.module.css";
<div className={styles.container_wrapper} />

/* MyComponent.module.css */
.container_wrapper { margin-top: 16px; }
```

### 3. Form Layout & Validation

- Use `Form.useForm()` for programmatic control.
- Use `name` as an array for nested fields.
- Use `dependencies` for conditional validation.

```jsx
const [form] = Form.useForm();
<Form form={form} layout="vertical" onFinish={onFinish}>
  <Form.Item
    name="email"
    label="Email"
    rules={[{ required: true, type: "email" }]}
  >
    <Input placeholder="Enter email" />
  </Form.Item>
</Form>;
```

---

## Decision Tree

```
Need a notification? → message.useMessage()
Need a confirmation? → Modal.useModal()
Need complex form?   → Form.useForm()
Need custom styling? → CSS Modules (snake_case)
```

---

## Code Examples

### Example: Standard Table with Actions

```jsx
import { Table, Space, Button } from "antd";

const MyTable = ({ data }) => {
  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleEdit(record)}>
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return <Table columns={columns} dataSource={data} rowKey="id" />;
};
```

---

## Commands

```bash
npm run lint             # Check for AntD rule violations
npm run format           # Format code
```
