-- Rollback: Remove auth_session_handoffs table
-- This migration cleans up the handoff table that was created but is no longer needed

-- Drop the table if it exists
DROP TABLE IF EXISTS public.auth_session_handoffs CASCADE;

-- Note: This migration is safe to run even if the table doesn't exist (IF EXISTS clause)
