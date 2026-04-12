# Project Rules

## Overview

Full-stack приложение: React + TypeScript (Vite) на фронте, Node.js + Express + MongoDB на бэке.  
Реализована JWT-аутентификация (register / login / me), защищённый dashboard, React Context для auth-состояния.

---

## Project Structure

```
project/
├── frontend/          — React + Vite + TypeScript
│   ├── src/
│   │   ├── api/           — axios instance + типы запросов/ответов
│   │   │   ├── auth.ts    — register(), login(), getMe()
│   │   │   └── types.ts   — AuthUser, AuthResponse, RegisterPayload, LoginPayload
│   │   ├── components/
│   │   │   ├── footer/    — Footer.tsx, Footer.module.css
│   │   │   ├── header/    — Header.tsx, Header.module.css
│   │   │   ├── privat-route/ — PrivateRoute.tsx
│   │   │   └── index.ts   — реэкспорт компонентов
│   │   ├── context/
│   │   │   ├── AuthContext.tsx — AuthProvider, useAuth()
│   │   │   └── index.ts
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── login-page/    — LoginPage.tsx
│   │   │   │   ├── register-page/ — RegisterPage.tsx
│   │   │   │   ├── Auth.module.css — общие стили auth-страниц
│   │   │   │   └── index.ts
│   │   │   ├── dashboard-page/    — DashboardPage.tsx, DashboardPage.module.css
│   │   │   └── index.ts
│   │   ├── App.tsx        — роутинг: /, /login, /register, /dashboard
│   │   ├── main.tsx       — точка входа, <BrowserRouter>
│   │   └── vite-env.d.ts
│   ├── eslint.config.js
│   ├── .prettierrc
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
│
└── backend/           — Express + TypeScript + MongoDB
    ├── src/
    │   ├── config/
    │   │   └── db.ts          — connectDB() через mongoose
    │   ├── middleware/
    │   │   └── auth.ts        — protect middleware, AuthRequest интерфейс
    │   ├── models/
    │   │   └── User.ts        — IUser, IUserDocument, User model
    │   ├── routes/
    │   │   └── auth.ts        — authRouter: /register, /login, /me
    │   └── index.ts           — Express app, cors, порт 5000
    ├── tsconfig.json
    ├── .env
    └── package.json
```

---

## Dev Commands

### Frontend
```bash
cd frontend
npm run dev        # Vite dev server → http://localhost:5173
npm run build      # сборка в dist/
npm run lint       # eslint src
npm run lint:fix   # eslint src --fix
npm run format     # prettier --write src
```

### Backend
```bash
cd backend
npm run dev        # nodemon --exec ts-node src/index.ts → http://localhost:5000
npm run build      # tsc → dist/
npm start          # node dist/index.js
```

---

## API Routes

Base URL: `http://localhost:5000/api`

| Method | Path              | Auth     | Description              |
|--------|-------------------|----------|--------------------------|
| POST   | /auth/register    | —        | { name, email, password } → { token, user } |
| POST   | /auth/login       | —        | { email, password } → { token, user }        |
| GET    | /auth/me          | Bearer   | → { user }               |
| GET    | /health           | —        | → { status: 'ok' }       |

Error shape всегда: `{ message: string }`

---

## Auth Flow

1. Token хранится в `localStorage` по ключу `"token"`
2. `AuthContext` (React Context) держит `user: AuthUser | null` и `loading: boolean`
3. При монтировании `AuthProvider` вызывает `getMe()` — восстанавливает сессию из token
4. `useAuth()` — хук для доступа к контексту; бросает Error если используется вне Provider
5. `PrivateRoute` — редиректит на `/login` если нет авторизованного юзера
6. `protect` middleware на бэке — читает `Authorization: Bearer <token>`, валидирует JWT, вешает `req.user`

---

## General Rules

- **TypeScript strict mode** в обоих проектах — `noUnusedLocals`, `noUnusedParameters` включены
- **Нет `any`** — только `unknown` с последующим narrowing
- **Только named exports** — никаких `export default`
- Файлы маленькие, с единственной ответственностью

---

## Frontend

### Components

- Только **функциональные компоненты** — стрелочные функции, `const`:
  ```tsx
  export const MyComponent = (): JSX.Element => { ... }
  ```
- `.tsx` для файлов с JSX, `.ts` для чистой логики
- Один компонент — один файл; имя файла = имя компонента

### File Structure

Каждый компонент в **отдельной папке** (kebab-case). Папка содержит всё своё:

```
src/components/
└── user-card/
    ├── UserCard.tsx
    ├── UserCard.module.css
    ├── UserCard.types.ts     — если нужны локальные типы
    ├── UserCard.utils.ts     — если нужны локальные хелперы
    └── index.ts              — export { UserCard } from './UserCard'
```

- `index.ts` в папке — единственная точка импорта:
  ```ts
  import { UserCard } from '@/components/user-card';   // правильно
  import { UserCard } from '@/components/user-card/UserCard';  // неправильно
  ```
- Общие типы/утилиты → `src/types/` или `src/utils/`

### Styling

- **CSS Modules** (`.module.css`) — никаких inline styles, никаких глобальных классов
- Файл стилей лежит рядом с компонентом в его папке

### State & Data

- React Context + hooks для глобального состояния (сейчас: `AuthContext`)
- `axios` для всех HTTP запросов через общий инстанс в `src/api/auth.ts`
  - Базовый URL: `http://localhost:5000/api`
  - Interceptor автоматически добавляет `Authorization: Bearer <token>` из localStorage
- JWT в `localStorage` — управляется через `saveAuth()` и `logout()` из `AuthContext`

### Routing

- `react-router-dom` v6, `<Routes>` / `<Route>`
- Маршруты: `/` → redirect `/login`, `/login`, `/register`, `/dashboard` (protected)
- `<PrivateRoute>` — обёртка для защищённых маршрутов

### Types

- Пропсы компонентов описывать через `interface`, не `type` (кроме union/intersection)
- Не использовать префикс `I` для пропсов (`ButtonProps`, а не `IButtonProps`)
- Модельные интерфейсы на бэке используют `I`-префикс (`IUser`, `IUserDocument`)

### tsconfig (frontend)
- `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`
- `jsx: react-jsx` (не нужен `import React`)
- `strict: true`, `noEmit: true` (компилирует Vite)

---

## Backend

### Language & Config

- TypeScript, `ts-node` для dev, `tsc` → `dist/` для production
- `target: ES2020`, `module: CommonJS`
- Только `.ts` файлы в `src/`

### Structure

- `src/config/` — подключение к БД
- `src/models/` — Mongoose схемы + TypeScript интерфейсы
- `src/routes/` — Express роутеры (один файл на ресурс)
- `src/middleware/` — переиспользуемые middleware

### Models

Паттерн для Mongoose документа:
```ts
export interface IUser { name: string; email: string; password: string; }
export interface IUserDocument extends IUser, Document { comparePassword(c: string): Promise<boolean>; }
const schema = new Schema<IUserDocument>({ ... });
export const User: Model<IUserDocument> = mongoose.model('User', schema);
```

- Пароли хэшируются в `pre('save')` хуке, `bcryptjs`, salt rounds = 12
- `comparePassword()` — метод на документе

### Error Handling

- `try/catch` в каждом async route handler
- Ответ при ошибке: `{ message: string }`
- Коды: 400 bad request, 401 unauthorized, 409 conflict, 500 server error

### Security

- Никогда не возвращать поле `password` — `.select('-password')`
- JWT secret и expiry из `.env` (`JWT_SECRET`, `JWT_EXPIRES_IN`)
- CORS: разрешён только `http://localhost:5173`

### .env keys (backend)
```
PORT=5000
MONGO_URI=...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
```

---

## Linting & Formatting (Frontend only)

### ESLint (`frontend/eslint.config.js`)

Flat config (ESLint 9+). Плагины: `@typescript-eslint`, `eslint-plugin-import`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-prettier`.

**Import order** — строго по группам, пустая строка между группами:
```
1. builtin          (node built-ins)
2. external         (react, axios, ...)
3. internal         (@/... алиасы)
4. parent/sibling   (../relative)
5. object           (namespace imports)
6. type             (import type ...)
7. unknown          (всё прочее)
   └─ after         *.css / *.module.css / *.scss  ← стили всегда последние
```
`warnOnUnassignedImports: true` — покрывает bare-импорты (`import './styles.css'`).

### Prettier (`.prettierrc`)
```json
{
  "semi": true,
  "singleQuote": false,
  "jsxSingleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```
Двойные кавычки везде (включая JSX). Prettier форматирует, ESLint `import/order` управляет порядком импортов.
