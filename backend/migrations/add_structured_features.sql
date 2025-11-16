-- Add structured_features column to plans table
-- This will store standardized feature flags for comparison

ALTER TABLE plans ADD COLUMN IF NOT EXISTS structured_features JSONB DEFAULT '{}'::jsonb;

-- Create index for better query performance on structured features
CREATE INDEX IF NOT EXISTS idx_plans_structured_features ON plans USING GIN(structured_features);

-- Add comment to describe the column
COMMENT ON COLUMN plans.structured_features IS 'Standardized features extracted from documents for comparison: network_hospitals_count, network_type, uae_coverage, gcc_coverage, international_coverage, outpatient_coverage, inpatient_coverage, dental_coverage, optical_coverage, maternity_coverage, pre_existing_conditions, pharmacy_coverage, emergency_coverage, ambulance_service, preventive_care, chronic_conditions_covered, mental_health_coverage, physiotherapy_coverage, alternative_medicine, waiting_period_days, copay_percentage, room_type, cashless_claims';
