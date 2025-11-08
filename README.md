# Outlook Complaint Summarizer (Next.js + Express + MongoDB + Microsoft Graph + Nginx + Let’s Encrypt + Docker)

This is a full-stack web application that authenticates users with Microsoft (Outlook) and displays a daily summary of emails (00:00–23:59 in GMT+6 Asia/Dhaka). It detects and summarizes complaints about internet services, the solutions provided, and whether each complaint is resolved. The UI uses Tailwind CSS with glassmorphism and supports light/dark mode, pagination, and date filters.

Core features
- Microsoft login via NextAuth + Azure AD provider (Microsoft Identity Platform)
- Daily summary of Outlook emails (configurable by date) constrained to Asia/Dhaka day bounds
- Heuristic extraction of:
  - Client Name
  - Problem Mentioned
  - Solution Provided
  - Status (Resolved/Unresolved/Unknown)
- Beautiful responsive Tailwind dashboard with glassmorphism, dark/light mode, pagination, date filter
- MongoDB persistence (storing daily summaries)
- node-cron job runs daily at 00:05 Asia/Dhaka (CRON_TIME=“5 0 * * *”, TIMEZONE=“Asia/Dhaka”)
- Microsoft Graph – application permissions (client credentials) to read a monitored mailbox
- Dockerized services and Nginx reverse proxy with Let’s Encrypt automatic certificates

Tech stack
- Frontend: Next.js (React 18), Tailwind CSS, NextAuth.js (Azure AD provider)
- Backend: Node.js (Express), Mongoose (MongoDB)
- Scheduling: node-cron
- Email: Microsoft Graph API
- Reverse proxy & TLS: Nginx + Certbot (Let’s Encrypt, webroot mode)
- Containerization: Docker & Docker Compose

Repository structure
- docker-compose.yml
- .env.example
- nginx/
  - Dockerfile
  - app.conf.template
  - start.sh
  - reload-watch.sh
- api/
  - Dockerfile
  - package.json
  - src/
    - index.js (Express app entry)
    - cron.js (scheduling + buildSummaryForDate)
    - graph.js (Graph client creds + message fetching + time window helpers)
    - parser.js (heuristics for problem/solution/status)
    - lib/db.js (Mongo connect)
    - models/Summary.js (Mongoose schema)
    - routes/summaries.js (GET /, POST /rebuild)
- web/
  - Dockerfile
  - package.json
  - next.config.js, postcss.config.js, tailwind.config.js
  - src/pages/_app.jsx
  - src/pages/index.jsx (Dashboard UI)
  - src/pages/api/auth/[...nextauth].js (NextAuth Azure AD)
  - src/pages/api/summaries/index.js (Next API proxy to backend)
  - src/styles/globals.css

Environment variables (.env)
Copy .env.example to .env and fill the placeholders:
- AZURE_CLIENT_ID=
- AZURE_CLIENT_SECRET=
- AZURE_TENANT_ID=
- NEXTAUTH_URL=https://your-domain.example
- NEXTAUTH_SECRET=strong-random-secret
- MONGODB_URI=mongodb+srv://user:pass@cluster/db?retryWrites=true&w=majority
- DOMAIN=your-domain.example
- ACME_EMAIL=you@example.com
- API_BASE_URL=http://api:4000
- CRON_TIME=5 0 * * *
- TIMEZONE=Asia/Dhaka
- MONITORED_MAILBOX=support@your-domain.example

How it works (high level)
1) Authentication (NextAuth + Azure AD): Users sign in with Microsoft. In production, NEXTAUTH_URL must be HTTPS on your domain.
2) Fetching emails: A scheduled cron job (00:05 Asia/Dhaka) reads emails for the specified day [00:00, 23:59] Asia/Dhaka using Microsoft Graph application permissions from the configured MONITORED_MAILBOX.
3) Parsing: The app runs heuristics over the subject/body preview to detect a problem statement, solution hints, and resolves the status.
4) Storage: The results are upserted into MongoDB per day (YYYY-MM-DD, Asia/Dhaka) in the Summary collection.
5) Display: The frontend retrieves summaries via /api/summaries, with pagination and a date filter (YYYY-MM-DD, Asia/Dhaka), and renders a glassmorphism dashboard.

Microsoft Graph permissions (Azure AD app)
- Register an app in Azure (steps below), create a client secret, and note the tenant ID.
- Add Microsoft Graph Application permissions: Mail.Read (admin consent required).
- MONITORED_MAILBOX must be the SMTP address of the mailbox to read (shared mailbox or user mailbox). Ensure your app is allowed to access that mailbox.

Local development (Windows 11) – without Docker
Prereqs
- Node.js 18+
- MongoDB URI (Atlas recommended)
- Azure AD app (see registration guide below)

Steps
1) Clone the repo and create your .env from .env.example
2) Terminal A – API
   - cd api
   - npm install
   - npm run dev
   - Serves http://localhost:4000
3) Terminal B – Web
   - cd web
   - npm install
   - npm run dev
   - Serves http://localhost:3000
4) Open http://localhost:3000 and sign in with Microsoft.
5) To force a rebuild of a specific day’s summary:
   - POST http://localhost:4000/api/summaries/rebuild?date=YYYY-MM-DD

Local development – Docker Compose
1) Copy .env.example to .env and fill in all values (NEXTAUTH_URL can be http://localhost:3000 for local dev; Let’s Encrypt will not issue certs for localhost).
2) Start:
   - docker compose up --build
3) Services
   - Web: http://localhost:3000
   - API: http://localhost:4000
   - Nginx: binds 80/443; no real certs will be issued for localhost.

VPS deployment guide (IONOS VPS) with Nginx + Let’s Encrypt
1) DNS
- Create an A record for DOMAIN pointing to the VPS public IP.

2) Install Docker + Docker Compose (Ubuntu example)
- sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg
- sudo install -m 0755 -d /etc/apt/keyrings
- curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
- echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
- sudo apt-get update
- sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

3) Clone and configure
- git clone https://github.com/Muminur/dailyemailsummary
- cd dailyemailsummary
- cp .env.example .env and edit values:
  - DOMAIN: your-domain.example (must match DNS)
  - ACME_EMAIL: your email for Let’s Encrypt
  - NEXTAUTH_URL=https://your-domain.example
  - Mongo URI + Azure IDs + client secret + MONITORED_MAILBOX

4) Open firewall (if applicable)
- Allow inbound 80/tcp and 443/tcp.

5) Launch containers
- docker compose up -d --build
- certbot service will attempt to obtain/renew certificates in a loop using webroot. Nginx will serve /.well-known/acme-challenge/ and reload certificates automatically when renewed.

6) Verify
- Visit https://your-domain.example to access the app.
- POST https://your-domain.example/api/summaries/rebuild?date=YYYY-MM-DD to build a day on-demand.

Azure AD registration guide
1) Azure Portal > Azure Active Directory > App registrations > New registration.
2) Name the app, choose account type (Single tenant recommended initially).
3) Redirect URIs:
   - Local: http://localhost:3000/api/auth/callback/azure-ad
   - Production: https://your-domain.example/api/auth/callback/azure-ad
4) After creating, note Application (client) ID and Directory (tenant) ID.
5) Certificates & secrets > New client secret; copy and store.
6) API permissions:
   - Microsoft Graph > Application permissions: Mail.Read (Grant admin consent).
7) For shared mailbox access, ensure your app permissions are consented and allowed to read the MONITORED_MAILBOX.

Security considerations
- Use a strong NEXTAUTH_SECRET.
- Keep .env secrets out of version control; use Docker secrets or an orchestrator for production.
- Restrict MongoDB network access to trusted sources.
- Protect the /api/summaries/rebuild endpoint behind auth or an admin token if exposing publicly.

Troubleshooting
- Certificates not issuing: Ensure DNS A record is correct, port 80 reachable, DOMAIN in .env matches TLS host.
- 502/504 from Nginx: Check web/api containers are healthy and listening (docker compose logs).
- Azure login issues: Verify redirect URIs and NEXTAUTH_URL exactly match.
- No email results: Confirm MONITORED_MAILBOX exists and Microsoft Graph application permission Mail.Read has admin consent.

Development notes
- Timezone handling: All day boundaries use Asia/Dhaka via Luxon; times converted to UTC ISO for Graph filters.
- Email parsing is heuristic; adjust keywords in api/src/parser.js to fit your domain.
- The cron job runs automatically in production mode on the API container (node src/index.js) and can be invoked manually via the rebuild endpoint.

License
- MIT (or update as needed).

Contributions
- PRs welcome. Please open an issue first for substantial changes to discuss scope and approach.
