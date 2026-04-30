<<<<<<< HEAD
# Team Task Manager (Full-Stack)

Separate full-stack project for the assignment.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite + Sequelize
- Auth: JWT + bcrypt
- Validation: Zod

## Features Completed

- Signup/Login
- Role-based access control (`ADMIN`, `MEMBER`)
- Project creation and member management
- Task creation, assignment, and status updates
- Dashboard summary (`TODO`, `IN_PROGRESS`, `DONE`, `OVERDUE`)

## Run Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Backend runs on `http://localhost:5001`.

## Run Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Deploy on Railway

Deploy as two Railway services from the same GitHub repo.

### 1) Backend service (Node API)

- Create a Railway project and choose **Deploy from GitHub repo**
- Add a service with **Root Directory**: `backend`
- Railway will use:
  - Build: `npm install`
  - Start: `npm start`
- Set backend environment variables:
  - `JWT_SECRET` = your strong secret
  - `DB_STORAGE` = `./data/team-task-manager.sqlite`
  - (`PORT` is auto-provided by Railway)
- After deploy, copy backend public URL (example: `https://your-backend.up.railway.app`)

### 2) Frontend service (Vite)

- Add second service in same Railway project with **Root Directory**: `frontend`
- Set frontend environment variable:
  - `VITE_API_URL` = `https://your-backend.up.railway.app/api`
- Railway build/start for frontend:
  - Build command: `npm install && npm run build`
  - Start command: `npm run preview -- --host 0.0.0.0 --port $PORT`
- Deploy and open frontend Railway URL

### 3) Important after first deploy

- If backend URL changes, update frontend `VITE_API_URL` and redeploy frontend.
- For production persistence, consider switching from SQLite file storage to managed Postgres.

## Main API Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/projects` (ADMIN)
- `GET /api/projects` (logged-in users by membership)
- `POST /api/projects/:projectId/members` (ADMIN)
- `POST /api/projects/:projectId/tasks` (ADMIN)
- `GET /api/tasks`
- `PATCH /api/tasks/:taskId/status` (ADMIN or assignee)
- `GET /api/dashboard`
=======
# TeamTaskManager
>>>>>>> 590ef452b6acbb1d7f7c20ab9c983fd6d347c43b
