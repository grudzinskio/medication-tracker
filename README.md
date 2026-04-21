# Medication Tracker

A full-stack web app for managing patient prescriptions and tracking medication adherence.

**Stack:** React + TypeScript (Vite) · Node.js + Express + Sequelize · MySQL

---

## 1. MySQL setup

1. **Copy the env template and fill in your credentials:**
   ```bash
   copy .env.example .env
   ```
   Edit `.env` — set `MYSQL_USER`, `MYSQL_PASSWORD`, and optionally `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE` (default: `Medication_Tracker`).

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Load the database:**
   - **First time / full reset** (drops DB, applies schema, loads all CSVs):
     ```bash
     python load_data.py --reset
     ```
   - **Reload data only** (truncates tables, re-loads CSVs):
     ```bash
     python load_data.py
     ```

---

## 2. Run the backend API

The Express + Sequelize API runs on **port 3001** and reads from the same `.env` credentials above.

```bash
cd backend
npm install       # first time only
npm run dev       # starts the API at http://localhost:3001/api
```

---

## 3. Run the frontend

The React app runs on **port 5173** (Vite default) and proxies all API calls to `http://localhost:3001/api`.

```bash
cd frontend
npm install       # first time only
npm run dev       # starts the UI at http://localhost:5173
```

> Both servers must be running at the same time. Open two terminals — one for `backend/`, one for `frontend/`.

---

## Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/dashboard` | Daily medication schedule per patient + adherence % panel |
| Patients | `/patients` | Full CRUD for patient records |
| Medications | `/medications` | Full CRUD for the medication catalog |
| Prescriptions | `/prescriptions` | Assign meds to patients; view/add refills per prescription |
| Doctors | `/doctors` | Full CRUD for prescribing doctors |
| Pharmacies | `/pharmacies` | Full CRUD for pharmacies |

## Project structure

```
medication-tracker/
├── .env                   # MySQL credentials (do not commit)
├── .env.example           # Template
├── term-project-schema.sql
├── generate_data.py       # Generates synthetic CSV data
├── load_data.py           # Loads CSVs into MySQL
├── requirements.txt       # Python deps
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
