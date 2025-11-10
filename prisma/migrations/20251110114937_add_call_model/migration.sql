-- DropForeignKey
ALTER TABLE "Call" DROP CONSTRAINT "Call_callee_fkey";

-- DropForeignKey
ALTER TABLE "Call" DROP CONSTRAINT "Call_caller_fkey";

-- DropIndex
DROP INDEX "Call_callee_idx";

-- DropIndex
DROP INDEX "Call_caller_idx";

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_calleeId_fkey" FOREIGN KEY ("calleeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
