-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "delivered" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[];
