-- AlterTable
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PasswordResetToken' AND column_name = 'verified'
    ) THEN
        ALTER TABLE "PasswordResetToken" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;
