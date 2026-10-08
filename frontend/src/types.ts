export type Role = "CUSTOMER" | "INVESTIGATOR" | "ADMIN";
export type ClaimStatus = "SUBMITTED" | "UNDER_REVIEW" | "ADDITIONAL_INFO_REQUIRED" | "APPROVED" | "REJECTED";
export interface User { id: string; email?: string; name?: string; role: Role; }
export interface RiskAssessment { riskLevel?: string; fraudProbability?: number; riskScore?: number; explanation?: string; modelVersion?: string; status?: string; processingStatus?: string; riskFactors?: string[] | Record<string, unknown>; }
export interface Evidence { id: string; fileName: string; fileType?: string; description?: string; uploadedAt?: string; }
export interface ClaimEvent { id: string; eventType: string; description: string; createdAt: string; }
export interface InvestigationNote { id: string; content: string; createdAt: string; investigator?: User; }
export interface Claim { id: string; claimNumber?: string; title: string; description?: string; claimedAmount: number; status: ClaimStatus; createdAt?: string; user?: User; riskAssessment?: RiskAssessment; evidence?: Evidence[]; events?: ClaimEvent[]; policy?: { policyNumber?: string; provider?: string; startDate?: string; endDate?: string }; investigation?: { status?: string; notes?: InvestigationNote[] }; }
