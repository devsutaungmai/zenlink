-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MEETING', 'TRAINING', 'EVENT');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "location" TEXT,
    "type" "EventType" NOT NULL DEFAULT 'EVENT',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "allDepartments" BOOLEAN NOT NULL DEFAULT false,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventDepartment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_businessId_idx" ON "Event"("businessId");

-- CreateIndex
CREATE INDEX "Event_eventDate_idx" ON "Event"("eventDate");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "EventDepartment_eventId_idx" ON "EventDepartment"("eventId");

-- CreateIndex
CREATE INDEX "EventDepartment_departmentId_idx" ON "EventDepartment"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EventDepartment_eventId_departmentId_key" ON "EventDepartment"("eventId", "departmentId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDepartment" ADD CONSTRAINT "EventDepartment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDepartment" ADD CONSTRAINT "EventDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
