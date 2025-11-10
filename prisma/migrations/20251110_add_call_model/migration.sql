-- CreateTable
CREATE TABLE "public"."Call" (
    "id" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "calleeId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'phone',
    "status" TEXT NOT NULL DEFAULT 'calling',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "public"."Call" ADD CONSTRAINT "Call_caller_fkey" FOREIGN KEY ("callerId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
ALTER TABLE "public"."Call" ADD CONSTRAINT "Call_callee_fkey" FOREIGN KEY ("calleeId") REFERENCES "public"."User"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "Call_caller_idx" ON "public"."Call"("callerId");
CREATE INDEX "Call_callee_idx" ON "public"."Call"("calleeId");
