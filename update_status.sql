-- Update existing PENDING records to EMPLOYEE_PENDING
UPDATE "ShiftExchange" 
SET status = 'EMPLOYEE_PENDING' 
WHERE status = 'PENDING';

-- Update existing APPROVED records to stay APPROVED
-- (no change needed)

-- Update existing REJECTED records to stay REJECTED  
-- (no change needed)
