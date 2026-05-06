# Demo logins (school)

## Admin
- **username**: `admin`
- **password**: `password`

## Staff
- **pharmacy tech**: `pharmacytech` / `password`
- **secretary**: `secretary` / `password`

## Doctors
Doctor usernames are `doctor<DoctorID>` matching `DoctorID` in `data/doctors.csv` (e.g. first row → `doctor1`). Password is always `password`.

## Patients
There is **no** username called `patient`. Each patient signs in with:

- **Username** = that row’s **Email** in `data/patients.csv` (must match exactly).
- **Password** = `password` (demo seed from `load_data.py`).

Patient rows in the `Users` table are created only when you load data with **`load_data.py`** (it runs `seed_auth_demo_users` after importing CSVs). If you only imported CSVs by hand and never ran that script, patient login will not work.

If you run **`generate_data.py`** again, every patient email changes. Old email lists become wrong; always copy the **Email** column from your current `data/patients.csv`.

Example from the repository’s current `patients.csv` (first patient): **`randylowe@example.net`** / `password`

