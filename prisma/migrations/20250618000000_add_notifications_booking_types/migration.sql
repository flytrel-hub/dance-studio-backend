-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'PENDING';

-- AlterEnum
CREATE TYPE "BookingType" AS ENUM ('OPEN', 'APPLICATION');

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN "booking_type" "BookingType" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
