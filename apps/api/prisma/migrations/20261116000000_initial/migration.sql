CREATE TABLE "Event" ("id" TEXT NOT NULL, "title" TEXT NOT NULL, "dateTime" TIMESTAMP(3), "location" TEXT, "message" TEXT, "drawnAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Event_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Participant" ("id" TEXT NOT NULL, "eventId" TEXT NOT NULL, "name" TEXT NOT NULL, "matchId" TEXT, "tokenHash" TEXT, "tokenEncrypted" TEXT, "revealedAt" TIMESTAMP(3), CONSTRAINT "Participant_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Session" ("id" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Session_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Participant_matchId_key" ON "Participant"("matchId");
CREATE UNIQUE INDEX "Participant_tokenHash_key" ON "Participant"("tokenHash");
CREATE INDEX "Participant_eventId_idx" ON "Participant"("eventId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
