-- CreateTable
CREATE TABLE "public"."ChatUnread" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChatUnread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatUnread_chatId_userId_key" ON "public"."ChatUnread"("chatId", "userId");

-- AddForeignKey
ALTER TABLE "public"."ChatUnread" ADD CONSTRAINT "ChatUnread_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatUnread" ADD CONSTRAINT "ChatUnread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
