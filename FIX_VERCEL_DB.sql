-- FIX FOR VERCEL MIGRATION ERROR
-- Run this SQL on your Vercel Postgres database

-- Step 1: Check the current migration state
SELECT migration_name, started_at, finished_at, rolled_back_at, logs
FROM "_prisma_migrations"
WHERE migration_name LIKE '%add_verified%'
ORDER BY started_at DESC;

-- Step 2: Mark the failed migration as rolled back
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW(),
    finished_at = NULL
WHERE migration_name = '20251016091102_add_verified_to_password_reset_token';

-- Alternative: If the above doesn't work, delete the failed migration record
-- DELETE FROM "_prisma_migrations"
-- WHERE migration_name = '20251016091102_add_verified_to_password_reset_token';

-- Step 3: Verify the fix
SELECT migration_name, started_at, finished_at, rolled_back_at
FROM "_prisma_migrations"
WHERE migration_name LIKE '%add_verified%'
ORDER BY started_at DESC;

-- Step 4: Check if the 'verified' column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'PasswordResetToken'
AND column_name = 'verified';
