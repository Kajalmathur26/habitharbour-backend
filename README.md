# 🌿 HabitHarbor — Backend API

> REST API powering the Planora - digital planner & AI journal platform. Built with Node.js, Express, Supabase, and Google Gemini AI.

---

## 📋 Project Overview

HabitHarbor is an AI-powered personal productivity platform. This repository is the **REST API backend** handling authentication, all CRUD operations, AI features, automated email reminders, and analytics.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 4.18 |
| **Database** | PostgreSQL via Supabase |
| **Auth** | JWT (`jsonwebtoken`) + Google OAuth (`google-auth-library`) |
| **Password Hashing** | bcryptjs |
| **AI** | Google Gemini (`@google/generative-ai`) |
| **Email** | Nodemailer (password reset + event reminders) |
| **Security** | Helmet, CORS, express-rate-limit (200 req / 15 min) |
| **Logging** | Morgan |
| **Deployment** | Render.com |

---

## 📁 Project Structure

```
habitharbor-backend/
├── config/
│   ├── supabase.js             # Supabase client initialization
│   └── schema.sql              # Full PostgreSQL schema (idempotent)
├── controllers/
│   ├── authController.js       # Register, login, Google OAuth, profile
│   ├── taskController.js       # Task CRUD + reorder
│   ├── journalController.js    # Journal CRUD + image upload
│   ├── goalController.js       # Goals + milestones
│   ├── habitController.js      # Habits + daily log/unlog
│   ├── moodController.js       # Mood logging + stats
│   ├── eventController.js      # Calendar events
│   ├── financeController.js    # Transactions + analytics
│   ├── aiController.js         # Gemini AI features (6 endpoints)
│   ├── dashboardController.js  # Aggregated summary + weekly report
│   ├── searchController.js     # Cross-entity full-text search
│   ├── exportController.js     # CSV data export
│   └── adminController.js      # Admin: users + platform stats
├── models/
│   ├── userModel.js
│   ├── taskModel.js
│   ├── journalModel.js
│   ├── goalModel.js
│   ├── habitModel.js
│   ├── moodModel.js
│   ├── eventModel.js
│   ├── financeModel.js
│   ├── dashboardModel.js
│   ├── searchModel.js
│   ├── exportModel.js
│   └── adminModel.js
├── routes/
│   ├── authRoutes.js
│   ├── taskRoutes.js
│   ├── journalRoutes.js
│   ├── goalRoutes.js
│   ├── habitRoutes.js
│   ├── moodRoutes.js
│   ├── eventRoutes.js
│   ├── financeRoutes.js
│   ├── aiRoutes.js
│   ├── dashboardRoutes.js
│   ├── searchRoutes.js
│   ├── exportRoutes.js
│   └── adminRoutes.js
├── middleware/
│   └── auth.js                 # JWT Bearer token verification
├── services/
│   └── reminderService.js      # Scheduled email reminders for events (every 2 min)
├── utils/
│   ├── emailService.js         # Nodemailer email helper
│   └── errorHandler.js        # Global error handler middleware
├── app.js                      # Express app setup (routes, middleware, CORS)
├── server.js                   # Entry point — starts HTTP server
├── render.yaml                 # Render deployment config
└── package.json
```

---

## 📡 API Documentation

Base URL: `https://planora-backend-f2v7.onrender.com/api`  
All protected routes require: `Authorization: Bearer <jwt_token>`

### 🔐 Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Register with name, email, password |
| POST | `/login` | ❌ | Login and receive JWT token |
| POST | `/google-login` | ❌ | Login / register via Google OAuth credential |
| POST | `/forgot-password` | ❌ | Send password reset email |
| GET | `/profile` | ✅ | Get current user profile |
| PUT | `/profile` | ✅ | Update name, phone, avatar, preferences |
| DELETE | `/profile` | ✅ | Permanently delete account + all data |

### ✅ Tasks — `/api/tasks`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all tasks (filterable: `status`, `priority`, `category`) |
| POST | `/` | Create task |
| PUT | `/:id` | Update task |
| PUT | `/reorder` | Bulk reorder (drag-and-drop positions) |
| DELETE | `/:id` | Delete task |

### 📔 Journal — `/api/journal`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all entries |
| GET | `/:id` | Get single entry |
| POST | `/` | Create entry |
| POST | `/upload-image` | Upload inline image to Supabase Storage |
| PUT | `/:id` | Update entry |
| DELETE | `/:id` | Delete entry |

### 🎯 Goals — `/api/goals`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all goals with milestones |
| POST | `/` | Create goal |
| PUT | `/:id` | Update goal |
| DELETE | `/:id` | Delete goal |
| POST | `/:id/milestones` | Add milestone to a goal |
| PUT | `/milestones/:id` | Toggle milestone completion |
| DELETE | `/milestones/:id` | Delete milestone |

### 🔥 Habits — `/api/habits`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all habits with streak info |
| POST | `/` | Create habit |
| POST | `/:id/log` | Log habit as done today |
| DELETE | `/:id/log` | Un-log habit for today |
| PUT | `/:id` | Update habit |
| DELETE | `/:id` | Delete habit |

### 💭 Mood — `/api/moods`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Mood statistics (average, distribution, total days) |
| GET | `/` | Get last 30 days of mood logs |
| POST | `/` | Log today's mood (score 1–10, label, emotions, notes) |
| PUT | `/:id` | Edit a past mood entry |

### 💰 Finance — `/api/finance`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics` | Summary: income vs expense, trend, category breakdown |
| GET | `/` | Get all transactions |
| POST | `/` | Create transaction (income or expense) |
| PUT | `/:id` | Update transaction |
| DELETE | `/:id` | Delete transaction |

### 📅 Events — `/api/events`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get events (filterable by date range) |
| POST | `/` | Create event |
| PUT | `/:id` | Update event |
| DELETE | `/:id` | Delete event |

### 📊 Dashboard — `/api/dashboard`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Aggregated summary (tasks, mood trend, habits, goals, journals) |
| GET | `/weekly-report` | 7-day task completion + activity report |

### 🤖 AI (Gemini) — `/api/ai`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analyze` | Productivity + mood pattern analysis |
| POST | `/journal-prompts` | Generate journal writing prompt |
| POST | `/chat` | Chat with AI assistant |
| POST | `/suggest-goals` | AI-suggested goals |
| POST | `/daily-plan` | Generate structured daily schedule |
| POST | `/suggest-tasks` | AI-suggested tasks |

### Other

| Endpoint | Description |
|----------|-------------|
| `GET /api/search` | Cross-entity full-text search (tasks, journals, goals, habits) |
| `GET /api/export` | Export all user data as CSV |
| `GET /api/admin/...` | Admin: user list + platform analytics (admin role required) |
| `GET /health` | Health check — `{ status: "ok" }` |

---

## 🗄️ Database Schema

Full schema: [`config/schema.sql`](./config/schema.sql) — idempotent, safe to re-run.

**Tables:** `users`, `tasks`, `events`, `journal_entries`, `goals`, `goal_milestones`, `habits`, `habit_logs`, `mood_logs`, `finance_transactions`, `focus_sessions`

**Key design decisions:**
- All tables cascade-delete on user removal
- `updated_at` auto-managed by DB triggers
- `habit_logs` — UNIQUE per `(habit_id, log_date)`
- `mood_logs` — UNIQUE per `(user_id, log_date)` (one mood per day)
- Row Level Security (RLS) enabled on all tables
- Backend uses service role key, bypassing RLS in practice

---

## 🔔 Automated Reminders

`services/reminderService.js` runs every **2 minutes**, scans for events starting within the next 30 minutes, and emails the user via `utils/emailService.js` using Nodemailer.

---

## ⚙️ Installation

```bash
# 1. Clone
git clone https://github.com/Kajalmathur26/planora-backend.git
cd planora-backend

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Fill in all variables below

# 4. Set up database
# Paste config/schema.sql into Supabase SQL Editor and Run

# 5. Develop
npm run dev

# 6. Production
npm start
```

## 🔧 Environment Variables

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

JWT_SECRET=your-jwt-secret

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

GEMINI_API_KEY=your-gemini-api-key

EMAIL_USER=your@gmail.com
EMAIL_PASS=your-gmail-app-password
```

> ⚠️ Never commit real credentials — `.env` must be in `.gitignore`.

---

## 🌐 Deployment

**Live API:** [https://planora-backend-f2v7.onrender.com](https://planora-backend-f2v7.onrender.com)

**Deploy to Render:**
1. Push to GitHub
2. Create a **Web Service** on [Render](https://render.com)
3. Build command: `npm install` | Start command: `npm start`
4. Add all env variables in Render dashboard

---

## 🔒 Security

- Helmet (secure HTTP headers)
- CORS (allowed origins only)
- Rate limiting (200 req / 15 min / IP)
- JWT for all protected routes
- Passwords hashed with bcryptjs
- RLS enabled on all Supabase tables
