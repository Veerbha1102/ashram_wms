-- =============================================
-- AAKB - Early Exit Approval Feature Migration
-- Run this AFTER the main schema
-- =============================================

-- Add early exit columns to attendance table
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS early_exit_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS early_exit_reason TEXT,
ADD COLUMN IF NOT EXISTS early_exit_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS early_exit_approved_at TIMESTAMPTZ;

-- Update status constraint to include new statuses
-- (This will fail silently if constraint already correct)
-- You may need to drop and recreate the constraint manually if this fails

-- Add index for early exit requests (for Swamiji dashboard queries)
CREATE INDEX IF NOT EXISTS idx_attendance_early_exit ON attendance(early_exit_requested, early_exit_approved);
