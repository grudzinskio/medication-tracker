# Medication Tracker

## Project description

**Medication Tracker** is a full-stack web application for managing patient prescriptions and tracking medication adherence. Staff can maintain patients, medications, prescribing doctors, and pharmacies; assign prescriptions with refills; and review daily schedules and adherence metrics on a dashboard.

**Stack:** React + TypeScript (Vite) · Node.js + Express + Sequelize · MySQL

---

## Prerequisites

- **Node.js** (LTS recommended) — backend and frontend
- **MySQL** — server running and a user that can create databases (or an empty database you configure in `.env`)
- **Python 3** — only for loading or regenerating database CSVs (`requirements.txt`)

---

## Database setup (schema + seed data)

### 1. Configure environment

From the repository root, copy the env template and set your MySQL credentials:

```bash
# Windows (PowerShell/CMD)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Edit `.env` and set at least `MYSQL_USER` and `MYSQL_PASSWORD`. Optionally adjust `MYSQL_HOST`, `MYSQL_PORT`, and `MYSQL_DATABASE` (default database name: `Medication_Tracker`).

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Apply schema and load seed data

The schema lives in **`term-project-schema.sql`**. Seed data is provided as CSV files under **`data/`** (doctors, pharmacies, patients, medications, prescriptions, refills, dose logs).

- **First-time setup or full reset** — drops the configured database (if it exists), recreates it from `term-project-schema.sql`, then loads all CSVs:

  ```bash
  python load_data.py --reset
  ```

- **Reload CSV data only** — truncates tables and reloads from `data/*.csv` (schema unchanged):

  ```bash
  python load_data.py
  ```

### 4. Regenerating synthetic data (optional)

To generate new CSVs instead of the committed `data/` files, run **`generate_data.py`** (uses `Faker` and **`data/product.txt`** for medication names). Then load with `python load_data.py` or `python load_data.py --reset` as above.

---

## How to run the app

Complete **Database setup** first so the API can connect to MySQL.

### Backend API

Runs on **port 3001** and uses the same `.env` at the repository root.

```bash
cd backend
npm install       # first time only
npm run dev       # http://localhost:3001/api
```

### Frontend

Runs on **port 5173** (Vite default) and proxies API requests to `http://localhost:3001/api`.

```bash
cd frontend
npm install       # first time only
npm run dev       # http://localhost:5173
```

Run backend and frontend **at the same time** (e.g. two terminals). Open the UI at **http://localhost:5173**.

---

## Default test users

The app ships with demo accounts for local/testing use. **All demo passwords are `password`.**

| Role | Username pattern | Examples |
|------|------------------|----------|
| Admin | `admin` | `admin` |
| Staff | fixed usernames | `pharmacytech`, `secretary` |
| Doctors | `doctor` + numeric ID | `doctor1` … `doctor10` (matches seeded doctors) |
| Patients | patient email from seed data | e.g. `gilbertcamacho@example.com` |

For the full list of doctor and patient logins, see **[DEMO_LOGINS.md](./DEMO_LOGINS.md)**.

---

## Pages

| Page          | Route            | Description                                                |
| ------------- | ---------------- | ---------------------------------------------------------- |
| Dashboard     | `/dashboard`     | Daily medication schedule per patient + adherence % panel  |
| Patients      | `/patients`      | Full CRUD for patient records                              |
| Medications   | `/medications`   | Full CRUD for the medication catalog                       |
| Prescriptions | `/prescriptions` | Assign meds to patients; view/add refills per prescription |
| Doctors       | `/doctors`       | Full CRUD for prescribing doctors                          |
| Pharmacies    | `/pharmacies`    | Full CRUD for pharmacies                                   |

---

## Project structure

```
medication-tracker/
├── .env                   # MySQL credentials (do not commit)
├── .env.example           # Template
├── term-project-schema.sql
├── generate_data.py       # Optional: regenerates synthetic CSV data
├── load_data.py           # Applies schema (with --reset) and loads CSVs into MySQL
├── requirements.txt       # Python deps for load/generate scripts
├── data/                  # Seed CSVs (+ product.txt for generate_data.py)
├── backend/               # Node/Express API
│   ├── src/
│   │   ├── db/            # Sequelize connection
│   │   ├── models/        # Sequelize models + associations
│   │   └── routes/        # Express route handlers
│   └── package.json
└── frontend/              # React + Vite UI
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── services/api.ts
    │   └── types/
    └── package.json
```
