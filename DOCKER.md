# ClaraMed - Docker Setup & Operations Guide

This guide explains how to run and manage the entire ClaraMed application (Backend, Frontend, and Admin) using Docker and Docker Compose.

---

## Architecture Overview

| Service | Technology | Container Name | Port | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Backend** | Node.js / Express / Socket.io / Mongoose | `claramed-backend` | `4000` | REST API, Socket.io real-time chat, AI integration |
| **Frontend** | React / Vite / TailwindCSS | `claramed-frontend` | `5173` | Patient appointment booking & consultation portal |
| **Admin** | React / Vite / TailwindCSS | `claramed-admin` | `5174` | Admin & Doctor dashboard |

All services communicate over a dedicated bridge network (`claramed-network`) with isolated `node_modules` volumes and hot-reloading enabled.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- Verify installation:
  ```bash
  docker --version
  docker compose version
  ```

---

## Quick Start (Single Command)

From the project root directory (`claramed/`):

```bash
docker compose up --build
```

To run in detached (background) mode:

```bash
docker compose up --build -d
```

### Accessing the Applications

- **Frontend (Patient Portal):** [http://localhost:5173](http://localhost:5173)
- **Admin / Doctor Dashboard:** [http://localhost:5174](http://localhost:5174)
- **Backend API Health Check:** [http://localhost:4000/health](http://localhost:4000/health)

---

## Common Commands & Operations

### 1. Stopping Containers
```bash
# Gracefully stop all containers
docker compose stop

# Stop and remove containers + networks
docker compose down
```

### 2. Viewing Real-time Logs
```bash
# Stream logs for all services
docker compose logs -f

# Stream logs for a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f admin
```

### 3. Rebuilding After Installing New npm Packages
Whenever you add or update dependencies in `package.json`, trigger a rebuild with clean anonymous volumes:
```bash
docker compose down -v
docker compose up --build
```

### 4. Restarting a Single Service
```bash
docker compose restart backend
docker compose restart frontend
docker compose restart admin
```

### 5. Executing Commands Inside Containers
```bash
# Open interactive shell in backend container
docker compose exec backend sh

# Open interactive shell in frontend container
docker compose exec frontend sh
```

---

## Environment Configuration

Each service automatically reads its respective `.env` file when started with Docker Compose:

- **Backend:** `backend/.env` (MongoDB URI, JWT secret, Cloudinary, Razorpay/Stripe, Brevo SMTP, Gemini API key)
- **Frontend:** `frontend/.env` (`VITE_BACKEND_URL`, `VITE_RAZORPAY_KEY_ID`)
- **Admin:** `admin/.env` (`VITE_BACKEND_URL`, `VITE_CURRENCY`)

> **Note:** `.env` files are excluded from Docker image builds via `.dockerignore` for security, and are mounted at runtime by `docker-compose.yml`.

---

## Troubleshooting

### Port Conflicts
If you encounter `Error: listen EADDRINUSE: address already in use :::4000` (or `5173`/`5174`), ensure no local Node.js processes are running outside Docker on those ports.

### Clean Docker Cache
If you encounter unexpected build cache issues:
```bash
docker compose down -v --rmi all
docker compose up --build
```
