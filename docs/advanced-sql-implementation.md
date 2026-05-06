# 4. Advanced SQL Implementation

**Medication Tracker** relies on non-trivial, **parameterized** SQL (executed via Sequelize `sequelize.query` with `replacements`) to produce analytical insights for the Doctor Dashboard and authentication—well beyond basic CRUD.

**Source files:** `backend/src/routes/doctors.ts` (items 1–4), `backend/src/routes/auth.ts` (item 5).

---

## 1. Doctor roster with active prescription counts

Generates the primary patient list for the Doctor Dashboard by joining `Patients` with `Prescriptions`, using **`GROUP BY`** and **`COUNT(DISTINCT PrescriptionID)`**. The `:doctorId` placeholder is **`NULL`** for admins (all prescribers) or the logged-in doctor’s ID.

```typescript
const rosterSql = `
  SELECT p.PatientID, p.FirstName, p.LastName,
         COUNT(DISTINCT pr.PrescriptionID) AS ActiveRxCount
  FROM Patients p
  JOIN Prescriptions pr ON pr.PatientID = p.PatientID
  WHERE (:doctorId IS NULL OR pr.DoctorID = :doctorId)
  GROUP BY p.PatientID, p.FirstName, p.LastName
  ORDER BY p.LastName ASC, p.FirstName ASC
`;

const [rosterRows] = await (Doctor.sequelize ?? Prescription.sequelize)!.query(rosterSql, {
  replacements: { doctorId },
});
```

---

## 2. Per-patient adherence aggregates

Calculates adherence over a date range by joining **`Dose_Logs`** and **`Prescriptions`**. Uses **`SUM(CASE WHEN …)`** for Taken / Missed / Late counts, **`MAX(TimeTaken)`** for last activity, filters by **`DATE(TimeTaken)`** between `:from` and `:to`, and **`GROUP BY pr.PatientID`**.

```typescript
const countsSql = `
  SELECT pr.PatientID AS PatientID,
         SUM(CASE WHEN dl.Status = 'Taken'  THEN 1 ELSE 0 END) AS Taken,
         SUM(CASE WHEN dl.Status = 'Missed' THEN 1 ELSE 0 END) AS Missed,
         SUM(CASE WHEN dl.Status = 'Late'   THEN 1 ELSE 0 END) AS Late,
         COUNT(*) AS TotalDoses,
         MAX(dl.TimeTaken) AS LastLogAt
  FROM Dose_Logs dl
  JOIN Prescriptions pr ON pr.PrescriptionID = dl.PrescriptionID
  WHERE pr.PatientID IN (:patientIds)
    AND (:doctorId IS NULL OR pr.DoctorID = :doctorId)
    AND DATE(dl.TimeTaken) >= :from
    AND DATE(dl.TimeTaken) <= :to
  GROUP BY pr.PatientID
`;

const [countsRows] = await (Prescription.sequelize ?? DoseLog.sequelize)!.query(countsSql, {
  replacements: { patientIds, doctorId, from, to },
});
```

---

## 3. “Missed / late today” alerts

Joins dose logs to prescriptions, restricts to **`DATE(dl.TimeTaken) = :today`**, and uses a conditional **`SUM`** for missed plus late doses per patient.

```typescript
const missedTodaySql = `
  SELECT pr.PatientID AS PatientID,
         SUM(CASE WHEN dl.Status IN ('Missed','Late') THEN 1 ELSE 0 END) AS MissedTodayCount
  FROM Dose_Logs dl
  JOIN Prescriptions pr ON pr.PrescriptionID = dl.PrescriptionID
  WHERE pr.PatientID IN (:patientIds)
    AND (:doctorId IS NULL OR pr.DoctorID = :doctorId)
    AND DATE(dl.TimeTaken) = :today
  GROUP BY pr.PatientID
`;

const [missedTodayRows] = await (Prescription.sequelize ?? DoseLog.sequelize)!.query(missedTodaySql, {
  replacements: { patientIds, doctorId, today },
});
```

---

## 4. Daily trend series

Drives chart-style aggregates by grouping on **`DATE(dl.TimeTaken)`** with the same conditional **`SUM`** pattern for status breakdown and total dose count.

```typescript
const trendSql = `
  SELECT DATE(dl.TimeTaken) AS Date,
         SUM(CASE WHEN dl.Status = 'Taken'  THEN 1 ELSE 0 END) AS Taken,
         SUM(CASE WHEN dl.Status = 'Missed' THEN 1 ELSE 0 END) AS Missed,
         SUM(CASE WHEN dl.Status = 'Late'   THEN 1 ELSE 0 END) AS Late,
         COUNT(*) AS TotalDoses
  FROM Dose_Logs dl
  JOIN Prescriptions pr ON pr.PrescriptionID = dl.PrescriptionID
  WHERE pr.PatientID IN (:patientIds)
    AND (:doctorId IS NULL OR pr.DoctorID = :doctorId)
    AND DATE(dl.TimeTaken) >= :from
    AND DATE(dl.TimeTaken) <= :to
  GROUP BY DATE(dl.TimeTaken)
  ORDER BY DATE(dl.TimeTaken) ASC
`;

const [trendRows] = await (Prescription.sequelize ?? DoseLog.sequelize)!.query(trendSql, {
  replacements: { patientIds, doctorId, from, to },
});
```

---

## 5. Login role loading

After validating credentials, loads RBAC names by joining **`UserRoles`** to **`Roles`** with **`WHERE ur.UserID = :userId`** (parameterized).

```typescript
const [roleRows] = await sequelize.query(
  `
  SELECT r.Name
  FROM UserRoles ur
  JOIN Roles r ON r.RoleID = ur.RoleID
  WHERE ur.UserID = :userId
  `,
  { replacements: { userId: row.UserID } },
);
```

---

## How to “run” this logic locally

1. Complete DB setup: `python load_data.py --reset` (from repo root).
2. Start API: `cd backend && npm run dev`.
3. **Doctor dashboard queries (1–4):** `GET http://localhost:3001/api/doctors/me/dashboard` with a **`Bearer`** JWT for `doctor1` / password `password` (see `DEMO_LOGINS.md`).
4. **Login query (5):** `POST http://localhost:3001/api/auth/login` with JSON `{ "username": "doctor1", "password": "password" }`.
