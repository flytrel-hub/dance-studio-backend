-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "BookingType" AS ENUM ('OPEN', 'APPLICATION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddBookingTypeColumn
DO $$ BEGIN
  ALTER TABLE "lessons" ADD COLUMN "booking_type" "BookingType" NOT NULL DEFAULT 'OPEN';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- CreateTable notifications (if not exists)
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_pkey" ON "notifications"("id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
