CREATE TABLE "LoginRateLimit" (
  "id" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoginRateLimit_pkey" PRIMARY KEY ("id")
);
