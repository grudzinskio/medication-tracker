-- ==============================================================================
-- Medication Tracker - Initial Database Schema Setup
-- Run this script to completely rebuild the database structure from scratch.
-- ==============================================================================

DROP DATABASE IF EXISTS Medication_Tracker;
CREATE DATABASE Medication_Tracker;
USE Medication_Tracker;

-- ==============================================================================
-- 1. INDEPENDENT TABLES (No Foreign Keys)
-- ==============================================================================

-- Doctors Table
CREATE TABLE Doctors (
    DoctorID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Specialty VARCHAR(100),
    ContactNumber VARCHAR(20)
);

-- Pharmacies Table
CREATE TABLE Pharmacies (
    PharmacyID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Address VARCHAR(255),
    Phone VARCHAR(20)
);

-- Patients Table
CREATE TABLE Patients (
    PatientID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL
);

-- Medications Table (Expanded to include FDA dataset columns)
CREATE TABLE Medications (
    MedID INT AUTO_INCREMENT PRIMARY KEY,
    DrugName VARCHAR(100) NOT NULL,      -- e.g., 'Zepbound'
    GenericName VARCHAR(255),            -- e.g., 'tirzepatide'
    Form VARCHAR(100),                   -- e.g., 'INJECTION, SOLUTION'
    Route VARCHAR(100),                  -- e.g., 'SUBCUTANEOUS'
    Manufacturer VARCHAR(255),           -- e.g., 'Eli Lilly and Company'
    UnitType VARCHAR(500)                -- e.g., 'mg/.5mL' (can be long for multi-valent vaccines)
);

-- ==============================================================================
-- 2. DEPENDENT TABLES (Contain Foreign Keys)
-- ==============================================================================

-- Prescriptions Table (The central M:N linking table)
CREATE TABLE Prescriptions (
    PrescriptionID INT AUTO_INCREMENT PRIMARY KEY,
    PatientID INT NOT NULL,
    MedID INT NOT NULL,
    DoctorID INT NOT NULL,
    PharmacyID INT NOT NULL,
    Dosage VARCHAR(50) NOT NULL,
    Frequency VARCHAR(50),
    StartDate DATE NOT NULL,
    EndDate DATE,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_presc_patient 
        FOREIGN KEY (PatientID) REFERENCES Patients(PatientID) ON DELETE CASCADE,
    CONSTRAINT fk_presc_med 
        FOREIGN KEY (MedID) REFERENCES Medications(MedID) ON DELETE RESTRICT,
    CONSTRAINT fk_presc_doc 
        FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID) ON DELETE RESTRICT,
    CONSTRAINT fk_presc_pharm 
        FOREIGN KEY (PharmacyID) REFERENCES Pharmacies(PharmacyID) ON DELETE RESTRICT
);

-- Refills Table (Tracking pharmacy pick-ups)
CREATE TABLE Refills (
    RefillID INT AUTO_INCREMENT PRIMARY KEY,
    PrescriptionID INT NOT NULL,
    RefillDate DATE NOT NULL,
    QuantityDispensed INT NOT NULL CHECK (QuantityDispensed > 0),
    
    -- Foreign Key Constraints
    CONSTRAINT fk_refill_presc 
        FOREIGN KEY (PrescriptionID) REFERENCES Prescriptions(PrescriptionID) ON DELETE CASCADE
);

-- Dose Logs (Tracking when pills are actually taken)
CREATE TABLE Dose_Logs (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    PrescriptionID INT NOT NULL,
    TimeTaken DATETIME NOT NULL,
    Status VARCHAR(20) DEFAULT 'Taken' CHECK (Status IN ('Taken', 'Missed', 'Late')),
    
    -- Foreign Key Constraints
    CONSTRAINT fk_log_presc 
        FOREIGN KEY (PrescriptionID) REFERENCES Prescriptions(PrescriptionID) ON DELETE CASCADE
);

-- ==============================================================================
-- 3. INDEXES FOR QUERY OPTIMIZATION
-- ==============================================================================

-- Index for quick patient lookups by email (useful for user login later)
CREATE INDEX idx_patient_email ON Patients(Email);

-- Index for searching medications quickly by their proprietary name
CREATE INDEX idx_med_name ON Medications(DrugName);

-- Index for time-series analysis (e.g., finding all logs from the last 7 days)
CREATE INDEX idx_log_time ON Dose_Logs(TimeTaken);

-- Index for quickly grabbing all prescriptions for a single patient dashboard
CREATE INDEX idx_presc_patient ON Prescriptions(PatientID);