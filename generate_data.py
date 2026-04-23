import csv
import random
import os
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()

# --- Configuration ---
NUM_PATIENTS = 200
NUM_DOCTORS = 25
NUM_PHARMACIES = 20
NUM_PRESCRIPTIONS = 1000
DAYS_OF_LOGS = 90
MAX_MEDS_TO_IMPORT = 100 

# Define the data directory path
DATA_DIR = 'data'

def generate_csvs():
    # Ensure the /data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Define file paths
    product_txt_path = os.path.join(DATA_DIR, 'product.txt')
    
    # --- 1. Parse product.txt for Medications ---
    medications = []
    seen_drugs = set()
    med_id_counter = 1
    
    try:
        with open(product_txt_path, 'r', encoding='utf-8') as prod_file:
            reader = csv.DictReader(prod_file, delimiter='\t')
            for row in reader:
                drug_name = row.get('PROPRIETARYNAME', '').strip()
                generic_name = row.get('NONPROPRIETARYNAME', '').strip()
                form = row.get('DOSAGEFORMNAME', '').strip()
                route = row.get('ROUTENAME', '').strip()
                manufacturer = row.get('LABELERNAME', '').strip()
                unit_type = row.get('ACTIVE_INGRED_UNIT', '').strip()
                
                # Only process if it has a drug name and hasn't been seen yet
                if drug_name and drug_name.upper() not in seen_drugs:
                    seen_drugs.add(drug_name.upper())
                    medications.append({
                        'MedID': med_id_counter, 
                        'DrugName': drug_name, 
                        'GenericName': generic_name,
                        'Form': form,
                        'Route': route,
                        'Manufacturer': manufacturer,
                        'UnitType': unit_type
                    })
                    med_id_counter += 1
                    
                    if len(medications) >= MAX_MEDS_TO_IMPORT:
                        break
    except FileNotFoundError:
        print(f"Error: '{product_txt_path}' not found. Please ensure the file is in the /{DATA_DIR} folder.")
        return

    meds_csv_path = os.path.join(DATA_DIR, 'medications.csv')
    with open(meds_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['MedID', 'DrugName', 'GenericName', 'Form', 'Route', 'Manufacturer', 'UnitType'])
        writer.writeheader()
        writer.writerows(medications)
    print(f"Generated {meds_csv_path} ({len(medications)} rows)")

    # --- 2. Generate Doctors ---
    doctors = []
    specialties = ['General Practice', 'Cardiology', 'Psychiatry', 'Neurology', 'Internal Medicine']
    for i in range(1, NUM_DOCTORS + 1):
        doctors.append({
            'DoctorID': i,
            'FirstName': fake.first_name(),
            'LastName': fake.last_name(),
            'Specialty': random.choice(specialties),
            'ContactNumber': fake.numerify('###-###-####')
        })
    docs_csv_path = os.path.join(DATA_DIR, 'doctors.csv')
    with open(docs_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['DoctorID', 'FirstName', 'LastName', 'Specialty', 'ContactNumber'])
        writer.writeheader()
        writer.writerows(doctors)
    print(f"Generated {docs_csv_path}")

    # --- 3. Generate Pharmacies ---
    pharmacies = []
    for i in range(1, NUM_PHARMACIES + 1):
        # Generate a stable-ish but varied set of pharmacy names.
        # Avoid a fixed list so NUM_PHARMACIES can scale up safely.
        name = f"{fake.last_name()} {random.choice(['Pharmacy', 'Care', 'Rx', 'Health', 'Clinic Pharmacy'])}"
        pharmacies.append({
            'PharmacyID': i,
            'Name': name,
            'Address': f"{fake.street_address()}, {fake.city()}",
            'Phone': fake.numerify('###-###-####')
        })
    pharm_csv_path = os.path.join(DATA_DIR, 'pharmacies.csv')
    with open(pharm_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['PharmacyID', 'Name', 'Address', 'Phone'])
        writer.writeheader()
        writer.writerows(pharmacies)
    print(f"Generated {pharm_csv_path}")

    # --- 4. Generate Patients ---
    patients = []
    for i in range(1, NUM_PATIENTS + 1):
        patients.append({
            'PatientID': i,
            'FirstName': fake.first_name(),
            'LastName': fake.last_name(),
            'Email': fake.unique.email()
        })
    pat_csv_path = os.path.join(DATA_DIR, 'patients.csv')
    with open(pat_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['PatientID', 'FirstName', 'LastName', 'Email'])
        writer.writeheader()
        writer.writerows(patients)
    print(f"Generated {pat_csv_path}")

    # --- 5. Generate Prescriptions ---
    prescriptions = []
    frequencies = ['Once a day', 'Twice a day', 'Three times a day', 'As needed']

    rx_id = 1
    used_pairs = set()  # (patient_id, med_id)

    # Ensure multiple meds per patient: 3–8 prescriptions each, until we hit NUM_PRESCRIPTIONS.
    per_patient_targets = [random.randint(3, 8) for _ in range(NUM_PATIENTS)]
    random.shuffle(per_patient_targets)

    for patient_id, target in enumerate(per_patient_targets, start=1):
        if rx_id > NUM_PRESCRIPTIONS:
            break

        for _ in range(target):
            if rx_id > NUM_PRESCRIPTIONS:
                break

            # Pick a medication not yet used for this patient (try a few times).
            med_id = None
            for _attempt in range(30):
                candidate = random.randint(1, len(medications))
                if (patient_id, candidate) not in used_pairs:
                    med_id = candidate
                    break
            if med_id is None:
                # Fallback: allow duplicates if we couldn't find a unique pair quickly.
                med_id = random.randint(1, len(medications))

            used_pairs.add((patient_id, med_id))

            start_date = datetime.now() - timedelta(days=random.randint(0, 120))
            end_date = start_date + timedelta(days=random.randint(60, 240))

            prescriptions.append({
                'PrescriptionID': rx_id,
                'PatientID': patient_id,
                'MedID': med_id,
                'DoctorID': random.randint(1, NUM_DOCTORS),
                'PharmacyID': random.randint(1, NUM_PHARMACIES),
                'Dosage': f"{random.choice([2.5, 5, 10, 20, 50, 100, 200, 500])}",
                'Frequency': random.choice(frequencies),
                'StartDate': start_date.strftime('%Y-%m-%d'),
                'EndDate': end_date.strftime('%Y-%m-%d')
            })
            rx_id += 1

    # If we still have room, fill remaining prescriptions randomly (still biasing toward unique pairs).
    while rx_id <= NUM_PRESCRIPTIONS:
        patient_id = random.randint(1, NUM_PATIENTS)
        med_id = random.randint(1, len(medications))
        for _attempt in range(20):
            if (patient_id, med_id) not in used_pairs:
                break
            patient_id = random.randint(1, NUM_PATIENTS)
            med_id = random.randint(1, len(medications))
        used_pairs.add((patient_id, med_id))

        start_date = datetime.now() - timedelta(days=random.randint(0, 120))
        end_date = start_date + timedelta(days=random.randint(60, 240))
        prescriptions.append({
            'PrescriptionID': rx_id,
            'PatientID': patient_id,
            'MedID': med_id,
            'DoctorID': random.randint(1, NUM_DOCTORS),
            'PharmacyID': random.randint(1, NUM_PHARMACIES),
            'Dosage': f"{random.choice([2.5, 5, 10, 20, 50, 100, 200, 500])}",
            'Frequency': random.choice(frequencies),
            'StartDate': start_date.strftime('%Y-%m-%d'),
            'EndDate': end_date.strftime('%Y-%m-%d')
        })
        rx_id += 1
    rx_csv_path = os.path.join(DATA_DIR, 'prescriptions.csv')
    with open(rx_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['PrescriptionID', 'PatientID', 'MedID', 'DoctorID', 'PharmacyID', 'Dosage', 'Frequency', 'StartDate', 'EndDate'])
        writer.writeheader()
        writer.writerows(prescriptions)
    print(f"Generated {rx_csv_path}")

    # --- 6. Generate Refills ---
    refills = []
    refill_id = 1
    for p_id in range(1, NUM_PRESCRIPTIONS + 1):
        for _ in range(random.randint(1, 2)):
            refill_date = datetime.now() - timedelta(days=random.randint(1, 30))
            refills.append({
                'RefillID': refill_id,
                'PrescriptionID': p_id,
                'RefillDate': refill_date.strftime('%Y-%m-%d'),
                'QuantityDispensed': random.choice([30, 60, 90])
            })
            refill_id += 1
    refill_csv_path = os.path.join(DATA_DIR, 'refills.csv')
    with open(refill_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['RefillID', 'PrescriptionID', 'RefillDate', 'QuantityDispensed'])
        writer.writeheader()
        writer.writerows(refills)
    print(f"Generated {refill_csv_path}")

    # --- 7. Generate Dose Logs ---
    logs = []
    log_id = 1
    statuses = ['Taken', 'Taken', 'Taken', 'Taken', 'Taken', 'Taken', 'Missed', 'Late']

    def doses_per_day(freq: str) -> int:
        if freq == 'Once a day':
            return 1
        if freq == 'Twice a day':
            return 2
        if freq == 'Three times a day':
            return 3
        # As needed: very variable; often 0 or 1, sometimes 2
        return random.choices([0, 1, 2], weights=[0.45, 0.45, 0.10], k=1)[0]

    # Use prescription dates/frequency so total logs/day varies over time.
    rx_by_id = {p['PrescriptionID']: p for p in prescriptions}

    for rx_id in range(1, NUM_PRESCRIPTIONS + 1):
        rx = rx_by_id[rx_id]
        start_dt = datetime.strptime(rx['StartDate'], '%Y-%m-%d').date()
        end_dt = datetime.strptime(rx['EndDate'], '%Y-%m-%d').date()
        per_day = doses_per_day(rx['Frequency'])

        for day in range(DAYS_OF_LOGS):
            day_dt = (datetime.now() - timedelta(days=day)).date()
            if not (start_dt <= day_dt <= end_dt):
                continue

            # Slight day-to-day noise even for scheduled meds.
            today_doses = per_day
            if rx['Frequency'] != 'As needed':
                today_doses = max(0, per_day + random.choice([-1, 0, 0, 0, 1]))

            for _dose in range(today_doses):
                log_time = datetime.now() - timedelta(
                    days=day,
                    hours=random.randint(0, 20),
                    minutes=random.randint(0, 59),
                    seconds=random.randint(0, 59),
                )
                logs.append({
                    'LogID': log_id,
                    'PrescriptionID': rx_id,
                    'TimeTaken': log_time.strftime('%Y-%m-%d %H:%M:%S'),
                    'Status': random.choice(statuses)
                })
                log_id += 1
            
    logs_csv_path = os.path.join(DATA_DIR, 'dose_logs.csv')
    with open(logs_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['LogID', 'PrescriptionID', 'TimeTaken', 'Status'])
        writer.writeheader()
        writer.writerows(logs)
    print(f"Generated {logs_csv_path}")

if __name__ == "__main__":
    generate_csvs()