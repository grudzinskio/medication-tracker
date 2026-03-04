import csv
import random
import os
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()

# --- Configuration ---
NUM_PATIENTS = 50
NUM_DOCTORS = 10
NUM_PHARMACIES = 5
NUM_PRESCRIPTIONS = 100
DAYS_OF_LOGS = 30 
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
    pharm_names = ['Walgreens', 'CVS', 'Rite Aid', 'Local Care Pharmacy', 'HealthMart']
    for i in range(1, NUM_PHARMACIES + 1):
        pharmacies.append({
            'PharmacyID': i,
            'Name': pharm_names[i-1],
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
    for i in range(1, NUM_PRESCRIPTIONS + 1):
        start_date = datetime.now() - timedelta(days=random.randint(30, 90))
        end_date = start_date + timedelta(days=random.randint(90, 180))
        prescriptions.append({
            'PrescriptionID': i,
            'PatientID': random.randint(1, NUM_PATIENTS),
            'MedID': random.randint(1, len(medications)), 
            'DoctorID': random.randint(1, NUM_DOCTORS),
            'PharmacyID': random.randint(1, NUM_PHARMACIES),
            'Dosage': f"{random.choice([2.5, 5, 10, 20, 50, 100, 200, 500])}",
            'Frequency': random.choice(frequencies),
            'StartDate': start_date.strftime('%Y-%m-%d'),
            'EndDate': end_date.strftime('%Y-%m-%d')
        })
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
    
    for p_id in range(1, NUM_PRESCRIPTIONS + 1):
        for day in range(DAYS_OF_LOGS):
            log_time = datetime.now() - timedelta(days=day, hours=random.randint(0, 5), minutes=random.randint(0, 59))
            logs.append({
                'LogID': log_id,
                'PrescriptionID': p_id,
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