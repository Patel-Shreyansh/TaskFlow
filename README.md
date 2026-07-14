# TaskFlow

A full-stack task and team management app: kanban-style task board, teammates, teams, and progress tracking, backed by a small JWT-authenticated REST API.

## Features

- **Authentication** — register/login with JWT sessions; every account's tasks, members, and teams are private to that account
- **Task board** — drag-and-drop kanban across To Do / In Progress / Completed, with priority levels, deadlines, and overdue highlighting
- **Search & filter** — live search by title, filter by priority
- **Members & teams** — add teammates, group them into teams, and assign tasks to either
- **Dashboard** — live counts for total/completed/in-progress/overdue tasks
- **Progress view** — completion percentage and a breakdown by priority
- **Dark mode** — toggle, persisted across sessions
- **Toast notifications** — no blocking `alert()` popups
- **Zero native dependencies** — no `bcrypt`/`sqlite3` build step; passwords are hashed with Node's built-in `crypto.scrypt` and data is stored with Node's built-in `node:sqlite`

## Tech stack

| Layer    | Choice |
|----------|--------|
| Backend  | Node.js, Express |
| Database | SQLite via Node's built-in `node:sqlite` module (no native compilation) |
| Auth     | JSON Web Tokens, passwords hashed with `crypto.scrypt` |
| Frontend | Plain HTML/CSS/JavaScript (no build step, no framework) |

## Requirements

- **Node.js 22.5 or newer** (needed for the built-in `node:sqlite` module)

## Getting started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then edit .env and set a real JWT_SECRET
npm start
```

The API runs on `http://localhost:5001` by default. `npm run dev` restarts automatically on file changes (`node --watch`).

Generate a strong secret with:

```bash
openssl rand -hex 32
```

### 2. Frontend

The frontend is static — no build step. Serve it with any static file server, for example:

```bash
cd frontend
npx serve .
# or: python3 -m http.server 8080
```

Then open the printed URL and go to `login.html` (or `register.html` to create your first account).

> The frontend expects the API at `http://<same-host>:5001/api` — see `frontend/js/api.js` if you need to point it somewhere else (e.g. a deployed backend URL).

## Project structure

```
TaskFlow/
├── backend/
│   ├── server.js              # entrypoint
│   ├── src/
│   │   ├── app.js             # Express app assembly
│   │   ├── config/env.js      # tiny .env loader (no dotenv dependency)
│   │   ├── db/database.js     # schema + node:sqlite connection
│   │   ├── middleware/        # auth, rate limiting, security headers, logging, errors
│   │   ├── controllers/       # auth, tasks, members, teams
│   │   ├── routes/
│   │   └── utils/password.js  # scrypt-based password hashing
│   ├── data/                  # SQLite file lives here (git-ignored)
│   └── .env.example
└── frontend/
    ├── index.html              # dashboard / tasks / members / teams / progress
    ├── login.html / register.html
    ├── css/
    └── js/
        ├── api.js               # fetch wrapper + auth token handling
        ├── auth.js              # login/register page logic
        ├── toast.js              # toast notifications
        └── app.js                 # dashboard logic
```

## API overview

All routes except register/login require `Authorization: Bearer <token>`.

| Method | Route                | Description                     |
|--------|-----------------------|----------------------------------|
| POST   | `/api/auth/register`  | Create an account, returns a token |
| POST   | `/api/auth/login`     | Log in, returns a token          |
| GET    | `/api/auth/me`        | Current user profile             |
| GET    | `/api/tasks`          | List tasks (`?status=&priority=&search=`) |
| GET    | `/api/tasks/stats`    | Dashboard counters                |
| POST   | `/api/tasks`          | Create a task                     |
| PUT    | `/api/tasks/:id`      | Update a task                      |
| DELETE | `/api/tasks/:id`      | Delete a task                      |
| GET/POST/DELETE | `/api/members` / `/api/members/:id` | Manage members |
| GET/POST/DELETE | `/api/teams` / `/api/teams/:id`     | Manage teams   |

## Security notes

- JWT secret is configured via `.env` (never commit a real one)
- Passwords are hashed with `crypto.scrypt` + a random salt, compared in constant time
- Every task/member/team is scoped to its owning user — no cross-account data leakage
- Auth endpoints are rate-limited to slow down brute-force attempts
- Basic hardening headers are set on every response

## License

MIT — see [LICENSE](LICENSE).

##Author 

Shreyansh Patel

