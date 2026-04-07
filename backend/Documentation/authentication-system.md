# Authentication System

**Archelon — Backend + Frontend Documentation**
Date: April 2026
Author: Ayush Rana

---

## Overview

Archelon uses JWT-based authentication. Users sign up with email/username/password, receive a JWT token, and include it in every subsequent request via the `Authorization: Bearer` header.

---

## Backend

### Files
- `backend/routers/auth.py` — signup and login endpoints
- `backend/db/users_db.py` — all DB queries for the users table
- `backend/jwt_handler.py` — token generation and verification

### Endpoints

| Endpoint | Method | Auth | What it does |
|---|---|---|---|
| `/api/auth/signup` | POST | None | Creates new user, returns JWT |
| `/api/auth/login` | POST | None | Validates credentials, returns JWT |
| `/api/auth/account` | DELETE | JWT | Deletes the logged-in user's account |

### Signup Flow

1. Check if username is taken → 400 if yes
2. Check if email is registered → 400 if yes
3. Hash password with `bcrypt`
4. Insert user into Supabase `users` table
5. Generate JWT with `user_id` and `email` in payload
6. Return `{ token, user }` — user object never includes password hash

### Login Flow

1. Accept `identifier` — can be email or username
2. Look up user by email OR username
3. Verify password with `bcrypt.checkpw`
4. Generate JWT
5. Return `{ token, user }`

### Password Hashing

```python
import bcrypt

# On signup — hash before storing
password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

# On login — verify
bcrypt.checkpw(password.encode(), stored_hash.encode())
```

Raw password is never stored. Only the bcrypt hash goes to DB.

### JWT

```python
import jwt

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM  = "HS256"
EXPIRY     = 30  # days

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email":   email,
        "exp":     datetime.utcnow() + timedelta(days=EXPIRY),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str = Depends(oauth2_scheme)) -> dict:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload  # contains user_id, email
```

`verify_token` is used as a FastAPI `Depends` on every protected endpoint:

```python
@router.get("/agents")
async def get_agents(current_user: dict = Depends(verify_token)):
    user_id = current_user["user_id"]
    ...
```

### Pydantic Models

```python
class SignupRequest(BaseModel):
    first_name:   str
    last_name:    str
    username:     str
    email:        str
    password:     str
    company_name: Optional[str] = None
    website:      Optional[str] = None
```

`Optional[str] = None` is required for nullable fields — plain `str = None` causes Pydantic 422 errors when `null` is sent from frontend.

### Delete Account

`DELETE /api/auth/account` — deletes the user row. Supabase `ON DELETE CASCADE` automatically removes all agents, documents, chunks, and token usage records.

---

## Frontend

### Files
- `frontend/src/services/auth_service.js` — all auth API calls
- `frontend/src/components/LoginPage.jsx` — login page at `/login`
- `frontend/src/components/SignupPage.jsx` — signup page at `/signup`

### auth_service.js

```javascript
export async function login(identifier, password) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/auth/login`, { ... });
  } catch {
    throw new Error('Unable to connect. Please wait a moment and try again.');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  localStorage.setItem('archelon_token', data.token);
  localStorage.setItem('archelon_user', JSON.stringify(data.user));
  return data;
}
```

Token and user stored in `localStorage`. The `try/catch` around `fetch` catches network failures (Railway cold start) and shows a friendly message instead of "Load Failed".

### authHeaders()

```javascript
export function authHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
```

Used in every authenticated API call:
```javascript
fetch(`${API_URL}/api/agents`, {
  headers: { 'Content-Type': 'application/json', ...authHeaders() }
})
```

### Login Page Features
- Single "Email or username" field — icon switches dynamically based on `@` presence
- Show/hide password toggle
- Error display on failed login
- Loading state on submit button

### Signup Page Features
- All fields from `users` table: first name, last name, username, email, password, company name (optional), website (optional)
- **Username availability check** — debounced, checks after 2 chars, shows green/red indicator
- **Live password strength** — 5 conditions: 8+ chars, uppercase, lowercase, number, special char — each turns teal as met
- **Blank field validation** — red border + "This field is required" on submit attempt
- Eye icon to show/hide password
- Green tick when all password conditions met

### Session Persistence

On app load, `main.jsx` reads `localStorage` for token and user:
```javascript
const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('archelon_token'));
const [user, setUser] = useState(JSON.parse(localStorage.getItem('archelon_user') || 'null'));
```

Logout clears both:
```javascript
export function logout() {
  localStorage.removeItem('archelon_token');
  localStorage.removeItem('archelon_user');
}
```

---

## Supabase Users Table

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        TEXT UNIQUE NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  company_name    TEXT,
  website         TEXT,
  is_email_verified BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  is_developer    BOOLEAN DEFAULT false,
  plan            TEXT DEFAULT 'free',
  token_limit     INTEGER DEFAULT 50000,
  tokens_used     INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now()
);
```

`is_developer` — manually set to `true` for Ayush's account. Controls access to the developer dashboard. Never exposed to regular users.

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `JWT_SECRET_KEY` | Railway + `.env` | Signs and verifies JWT tokens |
| `SUPABASE_URL` | Railway + `.env` | Supabase project URL |
| `SUPABASE_KEY` | Railway + `.env` | Supabase service role key |
