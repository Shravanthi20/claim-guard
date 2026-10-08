-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'INVESTIGATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvestigationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ADDITIONAL_INFO_REQUIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "cognitoSub" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "coverageAmount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "claimedAmount" DOUBLE PRECISION NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "s3Key" TEXT,
    "description" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimId" TEXT NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investigation" (
    "id" TEXT NOT NULL,
    "status" "InvestigationStatus" NOT NULL DEFAULT 'OPEN',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "claimId" TEXT NOT NULL,
    "investigatorId" TEXT,

    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationNote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "investigationId" TEXT NOT NULL,
    "investigatorId" TEXT NOT NULL,

    CONSTRAINT "InvestigationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "fraudProbability" DOUBLE PRECISION,
    "modelVersion" TEXT,
    "riskFactors" JSONB,
    "aiProcessingStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "claimId" TEXT NOT NULL,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimId" TEXT NOT NULL,

    CONSTRAINT "ClaimEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_cognitoSub_key" ON "User"("cognitoSub");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_policyNumber_key" ON "Policy"("policyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claimNumber_key" ON "Claim"("claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Investigation_claimId_key" ON "Investigation"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAssessment_claimId_key" ON "RiskAssessment"("claimId");

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_investigatorId_fkey" FOREIGN KEY ("investigatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationNote" ADD CONSTRAINT "InvestigationNote_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationNote" ADD CONSTRAINT "InvestigationNote_investigatorId_fkey" FOREIGN KEY ("investigatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEvent" ADD CONSTRAINT "ClaimEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
