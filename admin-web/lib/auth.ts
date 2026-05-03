import { DecodedIdToken } from 'firebase-admin/auth';

import { adminAuth } from './firebase-admin';
import { ApiError } from './http';

function adminAllowlist(): Set<string> {
  const raw = process.env.ADMIN_UID_ALLOWLIST ?? '';
  return new Set(
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

export async function requireAdmin(request: Request): Promise<DecodedIdToken> {
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authorization token is required.');
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw new ApiError(401, 'Authorization token is empty.');
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    throw new ApiError(401, 'Invalid Firebase ID token.');
  }

  const allowlist = adminAllowlist();
  const hasCustomAdminClaim = decoded.admin === true || decoded.role === 'admin';
  const hasAllowlistedUid = allowlist.has(decoded.uid);

  if (allowlist.size === 0 && !hasCustomAdminClaim) {
    throw new ApiError(
      403,
      'Admin access is blocked. Set ADMIN_UID_ALLOWLIST or admin custom claim.'
    );
  }

  if (!hasCustomAdminClaim && !hasAllowlistedUid) {
    throw new ApiError(403, 'You do not have admin access.');
  }

  return decoded;
}
