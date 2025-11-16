-- InsurAI Database Schema
-- Complete schema for insurance platform with UAE state support

-- Drop existing tables if they exist
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS states CASCADE;

-- States table for UAE emirates
CREATE TABLE states (
    id SERIAL PRIMARY KEY,
    state_name VARCHAR(100) UNIQUE NOT NULL,
    state_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert UAE states
INSERT INTO states (state_name, state_code) VALUES
    ('Abu Dhabi', 'AD'),
    ('Dubai', 'DU'),
    ('Sharjah', 'SH'),
    ('Ajman', 'AJ'),
    ('Umm Al Quwain', 'UAQ'),
    ('Ras Al Khaimah', 'RAK'),
    ('Fujairah', 'FU');

-- Users table with state support
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    state_id INTEGER REFERENCES states(id),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_state ON users(state_id);

-- Providers table
CREATE TABLE providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plans table with state support and comprehensive details
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
    state_id INTEGER REFERENCES states(id),
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('Health', 'Auto', 'Life', 'Property', 'Travel')),
    monthly_cost DECIMAL(10, 2) NOT NULL,
    annual_cost DECIMAL(10, 2),
    deductible DECIMAL(10, 2),
    max_coverage DECIMAL(12, 2),
    coverage_type VARCHAR(50),
    details_json JSONB,
    features TEXT[],
    eligibility_criteria TEXT,
    exclusions TEXT,
    document_source VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_plans_provider ON plans(provider_id);
CREATE INDEX idx_plans_state ON plans(state_id);
CREATE INDEX idx_plans_type ON plans(plan_type);
CREATE INDEX idx_plans_cost ON plans(monthly_cost);
CREATE INDEX idx_plans_active ON plans(is_active);
CREATE INDEX idx_plans_details ON plans USING GIN(details_json);

-- Chat history table for conversation context
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_user ON chat_history(user_id);
CREATE INDEX idx_chat_session ON chat_history(session_id);

-- Create default admin user (password: Admin@123)
-- Password hash for 'Admin@123' using bcrypt with 10 rounds
INSERT INTO users (email, password_hash, full_name, role, state_id) VALUES
    ('admin@insurai.com', '$2b$10$rZ8qXj0KFhBx9dJQh3Z8ZeYhR5mK9nB7gY5pL8wQ6xC4tD2vF3nHe', 'System Administrator', 'admin', 1);

-- Sample providers
INSERT INTO providers (name, logo_url, description) VALUES
    ('Daman', 'https://example.com/logos/daman.png', 'National Health Insurance Company'),
    ('Dubai Insurance', 'https://example.com/logos/dubai-insurance.png', 'Comprehensive insurance solutions'),
    ('AXA Gulf', 'https://example.com/logos/axa.png', 'Global insurance provider'),
    ('Oman Insurance Company', 'https://example.com/logos/oman-insurance.png', 'Trusted insurance services'),
    ('Watania International', 'https://example.com/logos/watania.png', 'Leading insurance provider');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
