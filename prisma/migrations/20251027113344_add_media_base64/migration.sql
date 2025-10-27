-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "audioBase64" TEXT,
ADD COLUMN     "audioMime" TEXT,
ADD COLUMN     "videoBase64" TEXT,
ADD COLUMN     "videoMime" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ChatUnread" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChatUnread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatUnread_chatId_userId_key" ON "ChatUnread"("chatId", "userId");

-- AddForeignKey
ALTER TABLE "ChatUnread" ADD CONSTRAINT "ChatUnread_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatUnread" ADD CONSTRAINT "ChatUnread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
