# Archelon — Development Update
**Date:** 29 March 2026
**Session Focus:** Auth System — Create Account, Login, Session Persistence, Routing

---

## What Was Built Today

### 1. Signup Page (`frontend/src/components/SignupPage.jsx`)

Full dedicated page at `/signup` with:

- All fields from the `users` table: First Name, Last Name, Username, Email, Password, Company Name, Website
- SVG icons on every field
- Live username availability check — green tick + "Username is available" or red X + "Username is already taken" as user types (after 2 characters)
- Live password strength checker — 5 conditions shown as a checklist that turns teal as each passes: 8+ chars, uppercase, lowercase, number, special character
- Eye icon on password field to toggle visibility
- Green tick beside eye icon when all password conditions are met
- Red border + "This field is required" inline label on blank required fields when form is submitted
- Success state — button replaced with teal "Account created! Taking you in..." message after successful signup
- Split layout: left branding panel (sticky, dark gradient, feature list) + right scrollable form

---

### 2. Login Page (`frontend/src/components/LoginPage.jsx`)

Full dedicated page at `/login` with:

- Single "Email or username" field — icon switches dynamically between email icon and person icon based on whether user typed `@`
- Password field with eye toggle
- Error message shown inline on failed login
- Loading state on the submit button
- Split layout matching the signup page design

---

### 3. Backend Auth Endpoints (`backend/routers/auth.py`)

Two endpoints built and deployed on Railway:

**`POST /api/auth/signup`**
- Accepts: `first_name`, `last_name`, `username`, `email`, `password`, `company_name` (optional), `website` (optional)
- Checks if username is already taken → 400 error
- Checks if email is already registered → 400 error
- Hashes password with bcrypt before storing — plain password never touches the DB
- Inserts user into Supabase `users` table
- Returns: `id`, `username`, `email`, `first_name`, `last_name`

**`POST /api/auth/login`**
- Accepts: `identifier` (email or username), `password`
- Detects email vs username by checking for `@`
- Fetches user from Supabase by email or username
- Verifies password against bcrypt hash
- Returns same user fields as signup on success
- Returns 401 on wrong credentials

---

### 4. DB Layer (`backend/db/`)

- `supabase_client.py` — singleton Supabase connection, reads `SUPABASE_URL` and `SUPABASE_KEY` from `.env`
- `users_db.py` — all DB queries for the users table: `create_user`, `get_user_by_email`, `get_user_by_username`, `username_exists`, `email_exists`

No DB calls are made from the frontend. All Supabase access is exclusively through the backend.

---

### 5. Frontend Auth Service (`frontend/src/services/auth_service.js`)

- `signup()` — maps frontend field names to backend snake_case, sends `POST /api/auth/signup`
- `login()` — sends `POST /api/auth/login` with identifier + password
- Both throw errors with the backend `detail` message so the UI can display them
- Uses `VITE_API_URL` env variable — no hardcoded URLs

---

### 6. Routing (`frontend/src/main.jsx`)

Full client-side routing with `react-router-dom`:

| Route | Page | Auth Required |
|---|---|---|
| `/` | Landing Page | No |
| `/signup` | Signup Page | No |
| `/login` | Login Page | No |
| `/chat` | Chat App | Yes — redirects to `/login` if not logged in |
| `*` | Redirects to `/` | — |

- Unauthenticated users hitting `/chat` are redirected to `/login` via `<Navigate>`
- `useNavigate` is called inside `RootInner` (inside `BrowserRouter`) to avoid context errors
- `RootInner` pattern: `Root` owns the `BrowserRouter`, `RootInner` is a child component that has access to `useNavigate`

---

### 7. Session Persistence on Refresh

- `isLoggedIn` is stored in `localStorage` on successful login
- On page refresh, `isLoggedIn` is read back from `localStorage` — user stays on `/chat`
- User data (`first_name`, `last_name`, `email`) also stored in `localStorage` so sidebar shows correct name after refresh
- Logout clears both `isLoggedIn` and `user` from `localStorage` and navigates to `/`

---

### 8. Loading Screen Flow

- Login/Signup success → `onLogin(userData)` called → `isLoading = true` → `LoadingScreen` renders as an overlay on top of routes (not replacing them)
- `LoadingScreen` `onDone` → clears loading, sets `isLoggedIn`, navigates to `/chat`
- Routes stay mounted during loading so URL context is never lost

---

### 9. Logout

- Logout button in the sidebar profile popup (styled red)
- Calls `handleLogout` → `localStorage.removeItem('isLoggedIn')` + `localStorage.removeItem('user')` → navigates to `/`
- User fully cleared from state and storage

---

### 10. Dynamic User Display in Sidebar

- Sidebar profile popup shows real First Name + Last Name and email from the logged-in user
- Data flows: backend response → `auth_service` → `onLogin(userData)` → `Root` state → `App` prop → `Sidebar` prop
- Hardcoded name and email replaced with dynamic values

---

### 11. Dark Theme Fix

- Landing page (`/`) was rendering in light mode after logout because the `dark` class wrapper was missing on the route
- Fixed by wrapping `LandingPage` in `<div className={theme}>` in the route definition
- Theme defaults to `'dark'` — landing page always opens dark

---

## Bugs Fixed Today

| Bug | Root Cause | Fix |
|---|---|---|
| Login redirected back to login page after loading screen | `BrowserRouter` was conditionally unmounted during loading, losing route context | Kept routes always mounted, rendered `LoadingScreen` as overlay |
| `useNavigate` not working in `Root` | `useNavigate` must be called inside a `BrowserRouter` child | Split into `Root` (owns router) + `RootInner` (has navigate access) |
| 422 error on signup | Pydantic rejected `null` for `website` field typed as `str` | Changed to `Optional[str] = None` |
| Landing page showing light theme after logout | `LandingPage` route had no `dark` class wrapper | Wrapped in `<div className={theme}>` |
| Refresh on `/chat` kicked user to landing page | `isLoggedIn` was only in React state, lost on refresh | Persisted to `localStorage` |

---

## Data Flow Summary

```
User fills signup/login form
        ↓
auth_service.js  →  POST /api/auth/signup or /api/auth/login
        ↓
routers/auth.py  →  validates input, hashes password (signup), verifies bcrypt hash (login)
        ↓
db/users_db.py   →  Supabase users table
        ↓
Returns user data (id, username, email, first_name, last_name)
        ↓
Stored in localStorage + React state
        ↓
LoadingScreen → navigate('/chat') → Chat App renders with user data in sidebar
```

---

## Current Route Structure

```
/           → LandingPage (dark theme default)
/signup     → SignupPage (full page, all user fields, live validation)
/login      → LoginPage (email or username + password)
/chat       → App (protected — redirects to /login if not authenticated)
*           → Redirects to /
```

---

## What Is Next

- JWT token-based auth (currently no token is issued — user data is trusted from localStorage)
- Retrieval pipeline — `agent_3_retrieval.py` with Supabase pgvector vector search
- Document ingestion pipeline — upload, chunk, embed, store
- Answer synthesizer — `agent_4_synthesizer.py`
- Chat history persistence in DB per `session_id`
