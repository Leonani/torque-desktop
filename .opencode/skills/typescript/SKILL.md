---
name: typescript
description: >
  TypeScript type-safe development patterns for JavaScript applications.
  Trigger: When writing TypeScript code, configuring tsconfig, defining types/interfaces, or migrating from JavaScript.
license: Apache-2.0
metadata:
  author: Jose Limardo
  version: "1.0"
  scope: [root]
  auto_invoke: "Writing TypeScript code"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, WebFetch, Task
---

## When to Use

- Writing type-safe React components and hooks
- Defining interfaces and types for data structures
- Configuring `tsconfig.json` for strict type checking
- Using generics and utility types
- Migrating JavaScript projects to TypeScript
- Implementing type guards and type narrowing

---

## Installation & Setup

### 1. Install TypeScript

```bash
# Install TypeScript
npm install -D typescript

# Initialize tsconfig.json
npx tsc --init
```

### 2. Configure `tsconfig.json` (Strict Mode Recommended)

```json
{
  "compilerOptions": {
    /* Language and Environment */
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    
    /* Modules */
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    
    /* Type Checking - STRICT MODE */
    "strict": true,                          // Enable all strict checks
    "noImplicitAny": true,                  // Error on implicit 'any'
    "strictNullChecks": true,               // null and undefined are distinct
    "strictFunctionTypes": true,            // Check function parameter compatibility
    "strictBindCallApply": true,            // Check bind/call/apply types
    "noImplicitThis": true,                 // Error on implicit 'this'
    "noUnusedLocals": true,                 // Error on unused variables
    "noUnusedParameters": true,             // Error on unused parameters
    "noImplicitReturns": true,              // Error on missing return
    "noFallthroughCasesInSwitch": true,     // Error on fallthrough cases
    
    /* Interop Constraints */
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    
    /* Skip Lib Check */
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Core Principles

### 1. Always Prefer Explicit Types Over `any`

```typescript
// ❌ WRONG: Using 'any' (no type safety)
function processData(data: any) {
  return data.map((item: any) => item.name)
}

// ✅ CORRECT: Define proper types
interface User {
  id: number
  name: string
  email: string
}

function processData(data: User[]): string[] {
  return data.map(item => item.name)
}
```

### 2. Use `interface` for Object Shapes, `type` for Unions/Intersections

```typescript
// ✅ Use interface for object structures
interface User {
  id: number
  name: string
  email: string
}

// ✅ Use type for unions and intersections
type Status = 'idle' | 'loading' | 'success' | 'error'
type UserWithStatus = User & { status: Status }

// ✅ Use type for function signatures
type Callback = (data: string) => void
```

### 3. Enable Strict Mode for Maximum Type Safety

```json
{
  "compilerOptions": {
    "strict": true  // Enables all strict type-checking options
  }
}
```

---

## Basic Types

### Primitive Types

```typescript
// String
let name: string = "John Doe"

// Number
let age: number = 30
let price: number = 99.99

// Boolean
let isActive: boolean = true

// Null and Undefined
let nullValue: null = null
let undefinedValue: undefined = undefined

// Symbol
let id: symbol = Symbol("id")

// BigInt
let bigNumber: bigint = 9007199254740991n
```

### Array Types

```typescript
// Array of strings
let names: string[] = ["Alice", "Bob", "Charlie"]
let altNames: Array<string> = ["Alice", "Bob"]

// Array of numbers
let numbers: number[] = [1, 2, 3, 4, 5]

// Array of objects
interface User {
  id: number
  name: string
}

let users: User[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
]
```

### Tuple Types

```typescript
// Fixed-length array with specific types
let tuple: [string, number] = ["Alice", 30]

// Tuple with optional element
let optionalTuple: [string, number?] = ["Bob"]

// Rest elements in tuples
let restTuple: [string, ...number[]] = ["Alice", 1, 2, 3]
```

### Enum Types

```typescript
// Numeric enum
enum Direction {
  Up = 1,
  Down,
  Left,
  Right,
}

let dir: Direction = Direction.Up // 1

// String enum (recommended)
enum Status {
  Idle = "IDLE",
  Loading = "LOADING",
  Success = "SUCCESS",
  Error = "ERROR",
}

let status: Status = Status.Loading // "LOADING"

// Const enum (inlined at compile time)
const enum LogLevel {
  Debug = "DEBUG",
  Info = "INFO",
  Error = "ERROR",
}
```

---

## Interfaces & Types

### Interface Declaration

```typescript
interface User {
  id: number
  name: string
  email: string
  age?: number              // Optional property
  readonly createdAt: Date  // Read-only property
}

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  createdAt: new Date(),
}

// user.createdAt = new Date() // ❌ Error: Cannot assign to 'createdAt'
```

### Extending Interfaces

```typescript
interface Person {
  name: string
  age: number
}

interface Employee extends Person {
  employeeId: number
  department: string
}

const employee: Employee = {
  name: "Bob",
  age: 35,
  employeeId: 12345,
  department: "Engineering",
}
```

### Type Aliases

```typescript
// Union types
type Status = 'idle' | 'loading' | 'success' | 'error'

// Intersection types
type Person = { name: string; age: number }
type Employee = { employeeId: number; department: string }
type EmployeePerson = Person & Employee

// Function types
type Callback = (message: string) => void
type MathOperation = (a: number, b: number) => number

// Object types
type User = {
  id: number
  name: string
  email: string
}
```

### Index Signatures

```typescript
// String index signature
interface Dictionary {
  [key: string]: string
}

const dict: Dictionary = {
  hello: "world",
  foo: "bar",
}

// Numeric index signature
interface NumberArray {
  [index: number]: number
}

const nums: NumberArray = [1, 2, 3, 4]
```

---

## Functions

### Function Type Annotations

```typescript
// Function with typed parameters and return type
function add(a: number, b: number): number {
  return a + b
}

// Arrow function
const multiply = (a: number, b: number): number => a * b

// Optional parameters
function greet(name: string, greeting?: string): string {
  return `${greeting || 'Hello'}, ${name}!`
}

// Default parameters
function increment(value: number, step: number = 1): number {
  return value + step
}

// Rest parameters
function sum(...numbers: number[]): number {
  return numbers.reduce((acc, num) => acc + num, 0)
}
```

### Function Overloads

```typescript
// Overload signatures
function createDate(timestamp: number): Date
function createDate(year: number, month: number, day: number): Date

// Implementation signature
function createDate(
  timestampOrYear: number,
  month?: number,
  day?: number
): Date {
  if (month !== undefined && day !== undefined) {
    return new Date(timestampOrYear, month - 1, day)
  }
  return new Date(timestampOrYear)
}

const date1 = createDate(2024, 1, 15)
const date2 = createDate(1705276800000)
```

### `void`, `never`, `unknown`

```typescript
// void: function returns nothing
function logMessage(message: string): void {
  console.log(message)
  // No return statement
}

// never: function never returns (throws error or infinite loop)
function throwError(message: string): never {
  throw new Error(message)
}

// unknown: safer alternative to 'any'
function processValue(value: unknown): string {
  // Must narrow type before using
  if (typeof value === "string") {
    return value.toUpperCase()
  }
  if (typeof value === "number") {
    return value.toString()
  }
  return String(value)
}
```

---

## Generics

### Generic Functions

```typescript
// Generic identity function
function identity<T>(value: T): T {
  return value
}

const num = identity<number>(42)        // number
const str = identity<string>("hello")   // string
const auto = identity(true)             // boolean (inferred)

// Generic array function
function firstElement<T>(arr: T[]): T | undefined {
  return arr[0]
}

const first = firstElement([1, 2, 3])        // number | undefined
const firstStr = firstElement(["a", "b"])    // string | undefined
```

### Generic Interfaces

```typescript
interface ApiResponse<T> {
  data: T
  status: number
  message: string
}

interface User {
  id: number
  name: string
}

const response: ApiResponse<User> = {
  data: { id: 1, name: "Alice" },
  status: 200,
  message: "Success",
}

// Generic array type
const users: ApiResponse<User[]> = {
  data: [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ],
  status: 200,
  message: "Success",
}
```

### Constrained Generics

```typescript
// Constraint: T must have a 'length' property
function logLength<T extends { length: number }>(value: T): void {
  console.log(value.length)
}

logLength("hello")        // ✅ string has length
logLength([1, 2, 3])      // ✅ array has length
// logLength(42)          // ❌ Error: number doesn't have length

// Constraint: T must extend a type
interface HasId {
  id: number
}

function findById<T extends HasId>(items: T[], id: number): T | undefined {
  return items.find(item => item.id === id)
}
```

---

## Utility Types

### Built-in Utility Types

```typescript
interface User {
  id: number
  name: string
  email: string
  age: number
}

// Partial<T> - Makes all properties optional
type PartialUser = Partial<User>
// { id?: number; name?: string; email?: string; age?: number }

// Required<T> - Makes all properties required
type RequiredUser = Required<PartialUser>
// { id: number; name: string; email: string; age: number }

// Readonly<T> - Makes all properties read-only
type ReadonlyUser = Readonly<User>
// { readonly id: number; readonly name: string; ... }

// Pick<T, K> - Pick specific properties
type UserPreview = Pick<User, 'id' | 'name'>
// { id: number; name: string }

// Omit<T, K> - Omit specific properties
type UserWithoutEmail = Omit<User, 'email'>
// { id: number; name: string; age: number }

// Record<K, T> - Create object type with specific keys and value type
type UserRoles = Record<string, User>
// { [key: string]: User }

// Exclude<T, U> - Exclude types from union
type Status = 'idle' | 'loading' | 'success' | 'error'
type NonIdleStatus = Exclude<Status, 'idle'>
// 'loading' | 'success' | 'error'

// Extract<T, U> - Extract types from union
type SuccessStatus = Extract<Status, 'success' | 'error'>
// 'success' | 'error'

// NonNullable<T> - Exclude null and undefined
type MaybeString = string | null | undefined
type DefiniteString = NonNullable<MaybeString>
// string

// ReturnType<T> - Get return type of function
function getUser() {
  return { id: 1, name: "Alice" }
}
type UserReturnType = ReturnType<typeof getUser>
// { id: number; name: string }
```

---

## React + TypeScript Patterns

### Functional Components

```typescript
import React from 'react'

// Basic component with props
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  variant = 'primary',
  disabled = false 
}) => {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={variant}
    >
      {label}
    </button>
  )
}

// Alternative syntax (preferred)
function Button2(props: ButtonProps) {
  return <button>{props.label}</button>
}
```

### Children Props

```typescript
import React, { ReactNode } from 'react'

interface CardProps {
  title: string
  children: ReactNode  // ReactNode allows any valid React child
}

const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  )
}

// Usage
<Card title="User Info">
  <p>Content goes here</p>
</Card>
```

### Event Handlers

```typescript
import React, { ChangeEvent, FormEvent, MouseEvent } from 'react'

const MyForm: React.FC = () => {
  // Input change event
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value)
  }

  // Form submit event
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Handle form submission
  }

  // Button click event
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    console.log('Button clicked')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleChange} />
      <button onClick={handleClick}>Submit</button>
    </form>
  )
}
```

### React Hooks with TypeScript

```typescript
import React, { useState, useEffect, useRef, useCallback } from 'react'

const MyComponent: React.FC = () => {
  // useState with type inference
  const [count, setCount] = useState(0)  // number (inferred)
  
  // useState with explicit type
  const [user, setUser] = useState<User | null>(null)
  
  // useState with initial value type
  interface FormData {
    email: string
    password: string
  }
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  })

  // useRef for DOM elements
  const inputRef = useRef<HTMLInputElement>(null)
  
  // useRef for mutable values
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // useEffect
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // useCallback with typed parameters
  const handleClick = useCallback((id: number) => {
    console.log('Clicked item:', id)
  }, [])

  return <input ref={inputRef} />
}
```

### Custom Hooks

```typescript
import { useState, useEffect } from 'react'

// Custom hook with return type
function useLocalStorage<T>(
  key: string, 
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      return initialValue
    }
  })

  const setValue = (value: T) => {
    try {
      setStoredValue(value)
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(error)
    }
  }

  return [storedValue, setValue]
}

// Usage
const [name, setName] = useLocalStorage<string>('name', 'Guest')
```

---

## Type Guards & Narrowing

### `typeof` Type Guards

```typescript
function processValue(value: string | number) {
  if (typeof value === 'string') {
    // TypeScript knows value is string here
    console.log(value.toUpperCase())
  } else {
    // TypeScript knows value is number here
    console.log(value.toFixed(2))
  }
}
```

### `instanceof` Type Guards

```typescript
class Dog {
  bark() {
    console.log('Woof!')
  }
}

class Cat {
  meow() {
    console.log('Meow!')
  }
}

function makeSound(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark()  // TypeScript knows it's a Dog
  } else {
    animal.meow()  // TypeScript knows it's a Cat
  }
}
```

### Custom Type Guards

```typescript
interface User {
  id: number
  name: string
  email: string
}

interface Admin extends User {
  role: 'admin'
  permissions: string[]
}

// Type predicate: 'is Admin'
function isAdmin(user: User | Admin): user is Admin {
  return 'permissions' in user
}

function greetUser(user: User | Admin) {
  if (isAdmin(user)) {
    // TypeScript knows user is Admin here
    console.log(`Admin: ${user.name}, Permissions: ${user.permissions}`)
  } else {
    // TypeScript knows user is User here
    console.log(`User: ${user.name}`)
  }
}
```

### Discriminated Unions

```typescript
interface SuccessResponse {
  status: 'success'
  data: string
}

interface ErrorResponse {
  status: 'error'
  error: string
}

type ApiResponse = SuccessResponse | ErrorResponse

function handleResponse(response: ApiResponse) {
  // Discriminate based on 'status' property
  if (response.status === 'success') {
    console.log(response.data)  // TypeScript knows it's SuccessResponse
  } else {
    console.error(response.error)  // TypeScript knows it's ErrorResponse
  }
}
```

---

## Advanced Patterns

### Mapped Types

```typescript
type Nullable<T> = {
  [P in keyof T]: T[P] | null
}

interface User {
  id: number
  name: string
}

type NullableUser = Nullable<User>
// { id: number | null; name: string | null }
```

### Conditional Types

```typescript
type IsString<T> = T extends string ? true : false

type A = IsString<string>   // true
type B = IsString<number>   // false

// Extract array element type
type ElementType<T> = T extends (infer U)[] ? U : never

type StringArray = ElementType<string[]>  // string
type NumberArray = ElementType<number[]>  // number
```

### Template Literal Types

```typescript
type EventName = 'click' | 'focus' | 'blur'
type EventHandler = `on${Capitalize<EventName>}`
// 'onClick' | 'onFocus' | 'onBlur'

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type Endpoint = `/api/${HTTPMethod}`
// '/api/GET' | '/api/POST' | '/api/PUT' | '/api/DELETE'
```

---

## Migration from JavaScript

### Step 1: Rename Files

```bash
# Rename .js to .ts (or .jsx to .tsx for React)
mv src/App.js src/App.tsx
mv src/utils/helpers.js src/utils/helpers.ts
```

### Step 2: Enable `allowJs` in `tsconfig.json`

```json
{
  "compilerOptions": {
    "allowJs": true,  // Allow JS files during migration
    "checkJs": false  // Don't type-check JS files yet
  }
}
```

### Step 3: Add Types Incrementally

```typescript
// Before (JavaScript)
function add(a, b) {
  return a + b
}

// After (TypeScript)
function add(a: number, b: number): number {
  return a + b
}
```

### Step 4: Install Type Definitions

```bash
# Install @types packages for third-party libraries
npm install -D @types/react @types/react-dom
npm install -D @types/node
```

---

## Common Mistakes

```typescript
// ❌ WRONG: Using 'any' (defeats TypeScript purpose)
function processData(data: any) {
  return data.map(item => item.name)
}

// ✅ CORRECT: Define proper types
interface User {
  name: string
}
function processData(data: User[]): string[] {
  return data.map(item => item.name)
}

// ❌ WRONG: Non-null assertion without checking
const element = document.getElementById('app')!
element.innerHTML = 'Hello'  // Could be null!

// ✅ CORRECT: Check for null
const element = document.getElementById('app')
if (element) {
  element.innerHTML = 'Hello'
}

// ❌ WRONG: Type assertion without validation
const value = input as string  // Unsafe!

// ✅ CORRECT: Use type guards
if (typeof input === 'string') {
  const value = input  // Safe!
}
```

---

## Decision Tree

| Scenario | Solution |
|----------|----------|
| Object shape | Use `interface` |
| Union/intersection types | Use `type` |
| Function signature | Use `type` or arrow function type |
| Need type safety for props | Define interface for props |
| Migrating from JS | Enable `allowJs`, add types incrementally |
| Unknown value type | Use `unknown` instead of `any` |
| Optional property | Use `?` (e.g., `age?: number`) |
| Avoid null/undefined | Enable `strictNullChecks` |

---

## Resources

- [TypeScript Official Documentation](https://www.typescriptlang.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app)
- [Type Challenges](https://github.com/type-challenges/type-challenges)
