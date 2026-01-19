import { NextApiRequest } from "next";
import { logger } from "./logger/logger";

// Stub implementations for web request utilities
// These are simplified versions without full authentication

export interface User {
  id: string;
  email?: string;
}

export interface ReportData {
  id: string;
  userId?: string;
  [key: string]: any;
}

export interface AccessCheckResult {
  hasAccess: boolean;
  reason?: string;
}

/**
 * Stub: Get user from request
 * Returns null since we don't have authentication
 */
export async function getUserFromRequest(req: NextApiRequest): Promise<User | null> {
  logger.info("[webRequestUtils] getUserFromRequest called (stub)");
  return null;
}

/**
 * Stub: Fetch any report by ID
 * Returns a mock report object
 */
export async function fetchAnyReportById(
  req: NextApiRequest,
  reportId: string
): Promise<ReportData | null> {
  logger.info(`[webRequestUtils] fetchAnyReportById called for: ${reportId} (stub)`);

  // Return a stub report object
  return {
    id: reportId,
  };
}

/**
 * Stub: Check report access
 * Always returns access granted
 */
export async function checkReportAccess(
  reportData: ReportData,
  user: User | null,
  requireOwnership: boolean = false,
  checkSharing: boolean = false
): Promise<AccessCheckResult> {
  logger.info("[webRequestUtils] checkReportAccess called (stub) - granting access");

  return {
    hasAccess: true,
    reason: "Access granted (stub implementation)",
  };
}
