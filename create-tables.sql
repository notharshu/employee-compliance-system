-- Employee Compliance System Database Setup
-- Run these commands in your Supabase SQL Editor

-- 1. Create user_role enum type (if not already created)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('employee', 'hr');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create document_status enum type
DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create department enum type
DO $$ BEGIN
    CREATE TYPE department_type AS ENUM (
        'mining_operations',
        'safety_department',
        'human_resources',
        'finance_accounts',
        'engineering_technical',
        'environment_forestry',
        'medical_health',
        'security',
        'transport',
        'stores_purchase',
        'legal',
        'administration',
        'it_systems'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Create designation enum type
DO $$ BEGIN
    CREATE TYPE designation_type AS ENUM (
        'junior_engineer',
        'assistant_engineer',
        'deputy_engineer',
        'assistant_manager',
        'deputy_manager',
        'manager',
        'deputy_general_manager',
        'general_manager',
        'chief_general_manager',
        'mining_foreman',
        'mining_mate',
        'surveyor',
        'safety_officer',
        'medical_officer',
        'security_officer',
        'clerk',
        'assistant',
        'technician',
        'operator',
        'driver',
        'helper',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role DEFAULT 'employee',
    
    -- Personal Information
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    
    -- Contact Information
    phone_number TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    permanent_address TEXT,
    current_address TEXT,
    
    -- Employment Information
    employee_id TEXT UNIQUE,
    department department_type,
    designation designation_type,
    date_of_joining DATE,
    reporting_manager TEXT,
    work_location TEXT,
    shift_timing TEXT,
    
    -- Compliance Information
    pan_number TEXT,
    aadhar_number TEXT,
    pf_number TEXT,
    esi_number TEXT,
    bank_account_number TEXT,
    ifsc_code TEXT,
    
    -- Safety & Medical
    medical_fitness_valid_till DATE,
    safety_training_valid_till DATE,
    gas_testing_certificate_valid_till DATE,
    
    -- System fields
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (id)
);

-- 4. Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    status document_status DEFAULT 'pending',
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES profiles(id),
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 6. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
