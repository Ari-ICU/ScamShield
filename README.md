# 🛡️ ScamShield Cambodia

> **Real-time scam call detection, live location tracking, and community reporting platform for Cambodia.**

ScamShield is a full-stack web application that bridges your Android phone's incoming call events to a live browser tracker — displaying caller risk scores, GPS coordinates, and AI-style transcripts in real time. It also lets the community search, report, and share scam phone numbers.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Number Search** | Instantly look up any phone number — carrier, risk score, scam category, and community reports |
| 📞 **Live Call Tracker** | Real-time incoming call overlay with radar, GPS triangulation, and audio transcript |
| 📍 **GPS Location Bridge** | Pair your phone via QR code to stream real GPS coordinates to the desktop tracker |
| 📝 **Community Reports** | Authenticated users can report scam numbers with location and category |
| 🔔 **Socket.io Alerts** | WebSocket-powered instant push notifications to all connected browsers |
| 🤖 **MacroDroid / Tasker** | One-tap webhook forwarding from Android automation apps |
| 🛡️ **Admin Dashboard** | Moderate reports, manage users, export number lists |
| 🌐 **Bilingual UI** | Full English / Khmer (ភាសាខ្មែរ) language toggle |

---

## 🏗️ Architecture

```
ScamShield/
├── backend/          # Node.js + Express + Socket.io + Prisma API (port 4000)
└── frontend/         # Next.js 15 + TypeScript web app (port 3000)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Socket.io Client, QRCode.react |
| Backend | Node.js, Express, Socket.io, Prisma ORM, Winston logger |
| Database | PostgreSQL |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Phone Bridge | MacroDroid / Tasker webhook → Express REST endpoint |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- (Optional) Android phone with MacroDroid or Tasker for real call forwarding

### 1. Clone the repository

```bash
git clone https://github.com/your-org/ScamShield.git
cd ScamShield
```

### 2. Set up the Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
PORT=4000
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/scamshield?schema=public"
JWT_ACCESS_SECRET="your_access_secret_here"
JWT_REFRESH_SECRET="your_refresh_secret_here"
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"

# Optional: Protect the /api/calls/detect webhook
# CALLS_SECRET="your_webhook_secret"
```

Run migrations and start the backend:

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

The backend will be available at **http://localhost:4000**

### 3. Set up the Frontend

```bash
cd frontend
```

Create `.env.local` (optional — defaults work for local dev):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

Install and run:

```bash
npm install
npm run dev
```

The frontend will be available at **http://localhost:3000**

---

## 📱 Phone Integration (Android)

ScamShield can intercept real incoming calls on your Android phone and broadcast them to the web tracker in real time.

### Option A — MacroDroid (Recommended)

1. Open the **Call Tracker** page on your PC → **Pair Phone** section
2. Download the MacroDroid macro from the QR card or via:
   ```
   GET http://localhost:4000/api/calls/download-macrodroid
   ```
3. Import the `.json` file into MacroDroid on your Android phone
4. Make sure **"Enable macro variables"** is checked in MacroDroid settings
5. The macro will POST `{call_number}` to your backend on every incoming call

### Option B — Tasker

1. Download the Tasker profile:
   ```
   GET http://localhost:4000/api/calls/download-tasker
   ```
2. Import the `.prf.xml` file into Tasker
3. Enable the profile — it triggers on the `Incoming Call` event

### Option C — Custom Webhook

Send a `POST` to `/api/calls/detect` from any automation tool:

```bash
curl -X POST http://YOUR_PC_IP:4000/api/calls/detect \
  -H "Content-Type: application/json" \
  -d '{"number": "0969551630", "category": "BANK_FRAUD"}'
```

> **Same Wi-Fi required** — your phone must be on the same local network as your PC.

---

## 🖥️ Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Home — search numbers, statistics, recent reports |
| `/search` | Advanced phone number lookup |
| `/report` | Submit a scam report (requires login) |
| `/call-tracker` | **Live call tracker** — shows incoming call overlay |
| `/call-tracker/pair` | **Phone bridge page** — scan on your phone to sync GPS |
| `/community` | Browse community-submitted reports |
| `/statistics` | Dashboard with charts and risk statistics |
| `/admin` | Admin panel — moderate reports and users |
| `/login` | User authentication |
| `/register` | Create an account |

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/calls/detect` | Receive call from phone automation (MacroDroid/Tasker) |
| `GET` | `/api/calls/active` | Get current active call state |
| `POST` | `/api/calls/active/answer` | Mark call as answered |
| `POST` | `/api/calls/active/hangup` | End current call |
| `POST` | `/api/calls/active/location` | Update GPS from paired phone |
| `GET` | `/api/numbers/search/:phone` | Look up a phone number |
| `GET` | `/api/reports` | Get recent community reports |
| `POST` | `/api/reports` | Submit a new report (JWT required) |
| `GET` | `/api/network-ip` | Returns server's local IP for QR pairing |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Log in, returns JWT tokens |

---

## 🔄 How Real-Time Calling Works

```
Android Phone (MacroDroid)
        │
        │ POST /api/calls/detect
        ▼
  Backend (Express)
        │
        ├─ Stores call in memory (currentActiveCall)
        │
        └─ Socket.io broadcast → "incoming_call" event
                │
                ▼
      Browser (/call-tracker page)
        │
        ├─ Socket receives "incoming_call" → shows RINGING overlay
        │
        └─ Polling fallback (every 3s) — catches missed socket events
```

### Resilience

The call-tracker page uses **both** Socket.io events (primary) **and** HTTP polling every 3 seconds (fallback). This ensures calls are always displayed even if the WebSocket briefly disconnects during reconnect cycles.

---

## 🗄️ Database Schema

```prisma
User         — id, email, password, role (USER | ADMIN)
PhoneNumber  — id, number, countryCode, riskScore, totalReport
Report       — id, category, description, province, district, commune, village
               └─ links to User and PhoneNumber
```

**Scam Categories:** `BANK_FRAUD`, `FAKE_DELIVERY`, `INVESTMENT`, `LOTTERY`, `GOVERNMENT`, `ROMANCE`, `TECH_SUPPORT`, `OTHER`

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API server port (default: `4000`) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ | Secret for access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Secret for refresh tokens |
| `FRONTEND_URL` | No | Allowed CORS origin (default: `http://localhost:3000`) |
| `NODE_ENV` | No | `development` or `production` |
| `CALLS_SECRET` | No | Optional webhook guard for `/api/calls/detect` |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend API base URL (default: `http://localhost:4000/api`) |
| `NEXT_PUBLIC_SOCKET_URL` | No | Socket.io server URL (default: `http://localhost:4000`) |

---

## 🛠️ Development Scripts

### Backend

```bash
npm run dev          # Start with hot reload (tsx + nodemon)
npm run build        # Compile TypeScript
npm run start        # Run compiled production build
npx prisma studio    # Open Prisma database UI
npx prisma migrate dev --name <name>  # Create & run a migration
```

### Frontend

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Run production build
npm run lint         # Lint check
```

### Packaging (Zip without node_modules)

To package the project into a lightweight ZIP archive for sharing or deployment (automatically ignoring `node_modules`, `.next`, `dist`, `.env` secrets, logs, and other untracked artifacts):

```bash
./zip_project.sh
```

---

## 🧪 Testing the Call Tracker

### Using the built-in simulator (no phone needed)

1. Open **http://localhost:3000/call-tracker** on your PC (keep this tab open)
2. Open **http://localhost:3000/call-tracker/pair** in another tab or on your phone
3. Enter a test number and click **"Trigger Call Overlay"**
4. Switch to the `/call-tracker` tab → you should see the RINGING overlay appear within 3 seconds

### Using a real Android phone

1. Connect phone to the **same Wi-Fi** as your PC
2. Scan the QR code on `/call-tracker` with your phone
3. Install MacroDroid and import the macro (download from the Pair page)
4. Receive an incoming call on your phone → the PC browser auto-shows the overlay

---

## 🌏 Supported Cambodian Carriers

| Carrier | Number Prefixes |
|---------|----------------|
| Smart Axiata | 10, 15, 16, 69, 70, 81, 86, 87, 93, 96, 98 |
| Cellcard (CamGSM) | 11, 12, 17, 61, 76–79, 85, 89, 92, 99 |
| Metfone (Viettel) | 31, 60, 66–68, 71, 88, 90, 97 |
| Seatel | 18 |
| Cootel | 38 |
| Telecom Cambodia (Landline) | 23 (PP), 63 (SR), 53 (BTB), and more |

---

## 📄 License

This project is built for the purpose of protecting Cambodian citizens from scam phone calls.

---

> Built with ❤️ to protect Cambodia 🇰🇭 from phone scams — **ScamShield (ស្រោមការពារ)**
