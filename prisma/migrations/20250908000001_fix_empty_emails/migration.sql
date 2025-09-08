-- Convert empty email strings to NULL values
UPDATE "Employee" SET email = NULL WHERE email = '';
