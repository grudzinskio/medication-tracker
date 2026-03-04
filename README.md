# medication-tracker

## Loading data into MySQL

1. **Copy the env template and set your MySQL credentials:**
   ```bash
   copy .env.example .env
   ```
   Edit `.env` and set `MYSQL_USER`, `MYSQL_PASSWORD`, and optionally `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE` (default: `Medication_Tracker`).

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Load or reset and load:**
   - **First time or full reset** (drops DB, runs `term-project-schema.sql`, then loads all CSVs):
     ```bash
     python load_data.py --reset
     ```
   - **Reload data only** (truncates tables, then loads CSVs from `data/`):
     ```bash
     python load_data.py
     ```