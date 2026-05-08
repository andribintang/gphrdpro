# HRD Lite Professional System 🚀

Sistem Manajemen SDM Modern — Mobile-First, Dark Mode, SaaS UI

---

## 🗂️ Struktur Project

```
hrd-system/
├── backend/         # Node.js + Express + MySQL
└── frontend/        # React + Vite + TailwindCSS
```

---

## ⚙️ Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env → isi Railway MySQL credentials
node scripts/migrate.js    # Buat tabel + seed data
npm run dev               # Port 5000
```

### 🔑 Login Credentials (setelah seed)
| Role       | Email                  | Password     |
|------------|------------------------|--------------|
| Admin      | admin@hrd.com          | Admin@123    |
| HR         | hr@hrd.com             | Hr@123456    |
| Supervisor | supervisor@hrd.com     | Super@123    |
| Karyawan   | ahmad@hrd.com          | Emp@123456   |

---

## 🎨 Setup Frontend

```bash
cd frontend
npm install
npm run dev   # Port 5173
```

---

## 📡 API Endpoints — Module 1: Authentication

| Method | Endpoint                   | Auth     | Description              |
|--------|----------------------------|----------|--------------------------|
| POST   | `/api/auth/login`          | Public   | Login user               |
| POST   | `/api/auth/register`       | Public   | Register user baru       |
| POST   | `/api/auth/refresh`        | Public   | Refresh access token     |
| POST   | `/api/auth/logout`         | Required | Logout & clear token     |
| GET    | `/api/auth/me`             | Required | Get current user profile |
| PUT    | `/api/auth/change-password`| Required | Ganti password           |
| GET    | `/health`                  | Public   | Health check             |

---

## 🗄️ Database Tables (Module 1)

| Table          | Keterangan                        |
|----------------|-----------------------------------|
| users          | Autentikasi + role management     |
| employees      | Profile detail karyawan           |
| attendance     | Data absensi harian               |
| leave_requests | Pengajuan & approval cuti         |
| payroll        | Penggajian bulanan                |

---

## 🧪 Cara Test Module 1

### 1. Test Health Check
```bash
curl http://localhost:5000/health
```

### 2. Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hrd.com","password":"Admin@123"}'
```

### 3. Test Get Profile
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token_dari_login>"
```

### 4. Test Frontend
- Buka http://localhost:5173
- Klik tombol demo role (Admin/HR/Supervisor/Karyawan)
- Login berhasil → redirect ke Dashboard

---

## 📦 Module Roadmap

| Module | Status | Fitur |
|--------|--------|-------|
| Module 1 | ✅ Done | Authentication, DB Schema, Layout |
| Module 2 | ⏳ Next | Attendance (GPS Check-in/out) |
| Module 3 | ⏳ | Leave Management + Approval |
| Module 4 | ⏳ | Payroll Processing |
| Module 5 | ⏳ | Employee Management CRUD |
| Module 6 | ⏳ | Reports & Analytics Dashboard |

---

## 🏗️ Tech Stack

**Backend**: Node.js · Express · Sequelize · MySQL · JWT · bcrypt  
**Frontend**: React 18 · Vite · TailwindCSS · React Router v6 · Axios  
**Database**: Railway MySQL (cloud-hosted)  
**Auth**: JWT + Refresh Token rotation  
