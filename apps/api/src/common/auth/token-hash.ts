import { createHash, createHmac } from 'node:crypto';

// Only the hash is stored: a database leak holds no usable token
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// An email link is rebuilt from its row id, so it is never stored, not even in the queue
export function linkToken(secret: string, tokenId: string): string {
  return createHmac('sha256', secret)
    .update(`one-time-link:${tokenId}`)
    .digest('base64url');
}
