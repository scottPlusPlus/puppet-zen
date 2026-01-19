import { logger } from "./logger/logger";

export type PuppeteerUser = {
  key: string;
  actorName: string;
};

let _users: Array<PuppeteerUser> | null = null;

// Type that works with both Next.js and Express requests
type RequestWithHeaders = {
  headers: {
    authorization?: string;
  };
};

/**
 * Get puppeteer user from request Authorization header
 * Works with both Next.js and Express requests
 */
export async function puppeteerUserFromReq(
  req: RequestWithHeaders
): Promise<PuppeteerUser | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn(`[Auth] No authorization header`);
    return null;
  }

  // Remove "Bearer " prefix if present
  const key = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : authHeader.trim();

  const users = getUsers();
  const user = users.find((u) => u.key === key);

  if (user) {
    logger.info(`[Auth] Valid user: ${user.actorName}`);
  } else {
    logger.warn(`[Auth] Invalid key`);
  }

  return user || null;
}

/**
 * Load users from PUPPETEER_GEN_USER environment variable
 * Format: "key1:Name1,key2:Name2"
 */
function getUsers(): Array<PuppeteerUser> {
  if (_users) {
    return _users;
  }

  const envValue = process.env.PUPPETEER_GEN_USER || "";

  if (!envValue.trim()) {
    logger.warn(`[Auth] PUPPETEER_GEN_USER not set`);
    _users = [];
    return _users;
  }

  const users: Array<PuppeteerUser> = [];
  const pairs = envValue.split(",");

  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed || !trimmed.includes(":")) {
      continue;
    }

    const [key, actorName] = trimmed.split(":");
    if (key && actorName) {
      users.push({ key: key.trim(), actorName: actorName.trim() });
    }
  }

  logger.info(`[Auth] Loaded ${users.length} users`);
  _users = users;
  return _users;
}
