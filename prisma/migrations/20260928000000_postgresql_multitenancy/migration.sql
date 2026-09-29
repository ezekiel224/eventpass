-- CreateTable
CREATE TABLE "AppInstallation" (
    "id" TEXT NOT NULL,
    "initializedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initializedById" TEXT,

    CONSTRAINT "AppInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT,
    "passwordHash" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "passwordChangedAt" TIMESTAMP(3),
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "system" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "assignable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserPermissionOverride" (
    "membershipId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("membershipId","permissionId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "organizationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#315CF5',
    "accentColor" TEXT NOT NULL DEFAULT '#315CF5',
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "photoUrl" TEXT,
    "bannerImageUrl" TEXT,
    "logoUrl" TEXT,
    "allergenOptions" TEXT,
    "menuOptions" TEXT,
    "organizer" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "passTheme" TEXT NOT NULL DEFAULT 'minimal',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "qrPassesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailConfirmationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "registrationDeadline" TIMESTAMP(3),
    "raffleName" TEXT,
    "raffleDescription" TEXT,
    "raffleStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "raffleTicketSalesOpen" BOOLEAN NOT NULL DEFAULT false,
    "raffleVisible" BOOLEAN NOT NULL DEFAULT false,
    "raffleStartsAt" TIMESTAMP(3),
    "raffleEndsAt" TIMESTAMP(3),
    "raffleTicketPriceCents" INTEGER NOT NULL DEFAULT 0,
    "prizeReceiptSubmitter" TEXT,
    "prizeReceiptExtension" TEXT,
    "prizeFundingSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendee" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "birthDate" TIMESTAMP(3),
    "selectedAllergens" TEXT,
    "selectedMenu" TEXT,
    "plusOneEnabled" BOOLEAN NOT NULL DEFAULT false,
    "plusOneFirstName" TEXT,
    "plusOneLastName" TEXT,
    "plusOneBirthDate" TIMESTAMP(3),
    "plusOneAllergens" TEXT,
    "plusOneMenu" TEXT,
    "under21" BOOLEAN NOT NULL DEFAULT false,
    "plusOneUnder21" BOOLEAN NOT NULL DEFAULT false,
    "ticketTier" TEXT NOT NULL DEFAULT 'General',
    "seat" TEXT,
    "vip" BOOLEAN NOT NULL DEFAULT false,
    "raffleTickets" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "customAnswers" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pass" (
    "id" TEXT NOT NULL,
    "attendeeId" TEXT NOT NULL,
    "fallbackCode" TEXT NOT NULL,
    "qrPayload" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "accessTokenHash" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "accessTokenRevokedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "attendeeId" TEXT NOT NULL,
    "scannedById" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duplicate" BOOLEAN NOT NULL DEFAULT false,
    "rawPayload" TEXT,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attendeeId" TEXT,
    "recipient" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "providerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RafflePrize" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "eligibility" TEXT,
    "winnerName" TEXT,
    "winnerAttendeeId" TEXT,
    "drawnAt" TIMESTAMP(3),
    "rerollCount" INTEGER NOT NULL DEFAULT 0,
    "acceptanceStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
    "acceptanceTokenHash" TEXT,
    "acceptanceExpiresAt" TIMESTAMP(3),
    "acceptanceSignerName" TEXT,
    "acceptanceSapId" TEXT,
    "taxAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "signatureDataUrl" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "acceptedIp" TEXT,
    "acceptedUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RafflePrize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaffleEntry" (
    "id" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "attendeeId" TEXT NOT NULL,
    "ticketCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaffleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaffleActivity" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaffleActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaffleDisplay" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'WALL',
    "tokenHash" TEXT,
    "pairingCodeHash" TEXT,
    "pairingExpiresAt" TIMESTAMP(3),
    "pairedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "viewportWidth" INTEGER,
    "viewportHeight" INTEGER,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "forcedPrizeId" TEXT,
    "rotationSeconds" INTEGER NOT NULL DEFAULT 12,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaffleDisplay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotingBallot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "coverImageUrl" TEXT,
    "confirmationMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VotingBallot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotingQuestion" (
    "id" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SINGLE',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VotingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotingOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VotingOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotingParticipant" (
    "id" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "employeeNumberHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VotingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotingSubmission" (
    "id" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VotingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotingAnswer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VotingAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpFrom" TEXT,
    "defaultTimezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCredential" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "encryptedConfig" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_slug_key" ON "Permission"("slug");

-- CreateIndex
CREATE INDEX "Role_organizationId_idx" ON "Role"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_organizationId_slug_key" ON "Role"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_roleId_idx" ON "OrganizationMembership"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "UserPermissionOverride_permissionId_idx" ON "UserPermissionOverride"("permissionId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_domain_key" ON "Organization"("domain");

-- CreateIndex
CREATE INDEX "Event_organizationId_status_idx" ON "Event"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Event_organizationId_slug_key" ON "Event"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "Attendee_eventId_status_idx" ON "Attendee"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Attendee_eventId_email_key" ON "Attendee"("eventId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Pass_attendeeId_key" ON "Pass"("attendeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Pass_fallbackCode_key" ON "Pass"("fallbackCode");

-- CreateIndex
CREATE UNIQUE INDEX "Pass_accessTokenHash_key" ON "Pass"("accessTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RafflePrize_acceptanceTokenHash_key" ON "RafflePrize"("acceptanceTokenHash");

-- CreateIndex
CREATE INDEX "RafflePrize_eventId_status_idx" ON "RafflePrize"("eventId", "status");

-- CreateIndex
CREATE INDEX "RaffleEntry_attendeeId_idx" ON "RaffleEntry"("attendeeId");

-- CreateIndex
CREATE UNIQUE INDEX "RaffleEntry_prizeId_attendeeId_key" ON "RaffleEntry"("prizeId", "attendeeId");

-- CreateIndex
CREATE INDEX "RaffleActivity_eventId_createdAt_idx" ON "RaffleActivity"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RaffleDisplay_tokenHash_key" ON "RaffleDisplay"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RaffleDisplay_pairingCodeHash_key" ON "RaffleDisplay"("pairingCodeHash");

-- CreateIndex
CREATE INDEX "RaffleDisplay_eventId_mode_lastSeenAt_idx" ON "RaffleDisplay"("eventId", "mode", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "VotingBallot_slug_key" ON "VotingBallot"("slug");

-- CreateIndex
CREATE INDEX "VotingBallot_eventId_status_idx" ON "VotingBallot"("eventId", "status");

-- CreateIndex
CREATE INDEX "VotingQuestion_ballotId_sortOrder_idx" ON "VotingQuestion"("ballotId", "sortOrder");

-- CreateIndex
CREATE INDEX "VotingOption_questionId_sortOrder_idx" ON "VotingOption"("questionId", "sortOrder");

-- CreateIndex
CREATE INDEX "VotingParticipant_ballotId_lastName_firstName_idx" ON "VotingParticipant"("ballotId", "lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "VotingParticipant_ballotId_employeeNumberHash_key" ON "VotingParticipant"("ballotId", "employeeNumberHash");

-- CreateIndex
CREATE UNIQUE INDEX "VotingSubmission_participantId_key" ON "VotingSubmission"("participantId");

-- CreateIndex
CREATE INDEX "VotingSubmission_ballotId_submittedAt_idx" ON "VotingSubmission"("ballotId", "submittedAt");

-- CreateIndex
CREATE INDEX "VotingAnswer_questionId_optionId_idx" ON "VotingAnswer"("questionId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "VotingAnswer_submissionId_questionId_optionId_key" ON "VotingAnswer"("submissionId", "questionId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_organizationId_key" ON "Setting"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "Session_organizationId_expiresAt_idx" ON "Session"("organizationId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiCredential_secretHash_key" ON "ApiCredential"("secretHash");

-- CreateIndex
CREATE INDEX "ApiCredential_organizationId_revokedAt_idx" ON "ApiCredential"("organizationId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiCredential_organizationId_name_key" ON "ApiCredential"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Integration_organizationId_active_idx" ON "Integration"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_organizationId_provider_name_key" ON "Integration"("organizationId", "provider", "name");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RafflePrize" ADD CONSTRAINT "RafflePrize_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleEntry" ADD CONSTRAINT "RaffleEntry_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "RafflePrize"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleEntry" ADD CONSTRAINT "RaffleEntry_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleActivity" ADD CONSTRAINT "RaffleActivity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleDisplay" ADD CONSTRAINT "RaffleDisplay_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingBallot" ADD CONSTRAINT "VotingBallot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingQuestion" ADD CONSTRAINT "VotingQuestion_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "VotingBallot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingOption" ADD CONSTRAINT "VotingOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "VotingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingParticipant" ADD CONSTRAINT "VotingParticipant_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "VotingBallot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingSubmission" ADD CONSTRAINT "VotingSubmission_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "VotingBallot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingSubmission" ADD CONSTRAINT "VotingSubmission_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "VotingParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingAnswer" ADD CONSTRAINT "VotingAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "VotingSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingAnswer" ADD CONSTRAINT "VotingAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "VotingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingAnswer" ADD CONSTRAINT "VotingAnswer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "VotingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCredential" ADD CONSTRAINT "ApiCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
