-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "imageData" BYTEA,
ADD COLUMN     "imageHeight" INTEGER,
ADD COLUMN     "imageMime" TEXT,
ADD COLUMN     "imageSize" INTEGER,
ADD COLUMN     "imageWidth" INTEGER,
ADD COLUMN     "photo" BYTEA;
