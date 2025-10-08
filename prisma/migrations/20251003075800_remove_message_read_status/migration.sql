/*
  Warnings:

  - You are about to drop the column `delivered` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `readBy` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Message" DROP COLUMN "delivered",
DROP COLUMN "readBy";
