import csv
import random
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

def generate_csvs():
    # --- 1. Parse product.txt for Medications ---
    medications = []
    seen_drugs = set()
    med_id_counter = 1
    
    try:
        with open('product.txt', 'r', encoding='utf-8') as prod_file:
            reader = csv.DictReader(prod_file, delimiter='\t')
            for row in reader:
                drug_name = row.get('PROPRIETARYNAME', '').strip()
                unit_type = row.get('ACTIVE_INGRED_UNIT', '').strip()
                
                if drug_name and drug_name.upper() not in seen_drugs:
                    seen_drugs.add(drug_name.upper())
                    medications.append({
                        'MedID': med_id_counter, 
                        'DrugName': drug_name, 
                        'UnitType': unit_type
                    })
                    med_id_counter += 1
                    
                    if len(medications) >= MAX_MEDS_TO_IMPORT:
                        break
    except FileNotFoundError:
        print("Error: 'product.txt' not found. Please ensure it is in the same folder.")
        return

    with open('medications.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['MedID', 'DrugName', 'UnitType'])
        writer.writeheader()
        writer.writerows(medications)
    print(f"Generated medications.csv ({len(medications)} rows)")

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
    with open('doctors.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['DoctorID', 'FirstName', 'LastName', 'Specialty', 'ContactNumber'])
        writer.writeheader()
        writer.writerows(doctors)
    print("Generated doctors.csv")

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
    with open('pharmacies.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['PharmacyID', 'Name', 'Address', 'Phone'])
        writer.writeheader()
        writer.writerows(pharmacies)
    print("Generated pharmacies.csv")

    # --- 4. Generate Patients ---
    patients = []
    for i in range(1, NUM_PATIENTS + 1):
        patients.append({
            'PatientID': i,
            'FirstName': fake.first_name(),
            'LastName': fake.last_name(),
            'Email': fake.unique.email()
        })
    with open('patients.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['PatientID', 'FirstName', 'LastName', 'Email'])
        writer.writeheader()
        writer.writerows(patients)
    print("Generated patients.csv")

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
    with open('prescriptions.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['PrescriptionID', 'PatientID', 'MedID', 'DoctorID', 'PharmacyID', 'Dosage', 'Frequency', 'StartDate', 'EndDate'])
        writer.writeheader()
        writer.writerows(prescriptions)
    print("Generated prescriptions.csv")

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
    with open('refills.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['RefillID', 'PrescriptionID', 'RefillDate', 'QuantityDispensed'])
        writer.writeheader()
        writer.writerows(refills)
    print("Generated refills.csv")

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
            
    with open('dose_logs.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['LogID', 'PrescriptionID', 'TimeTaken', 'Status'])
        writer.writeheader()
        writer.writerows(logs)
    print("Generated dose_logs.csv")

if __name__ == "__main__":
    generate_csvs()