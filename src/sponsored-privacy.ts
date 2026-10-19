import type { SponsoredPrivacyTransactionRequest } from './types.js';
import { invalid } from './validation.js';

function object(value: unknown, fields: string[], name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    invalid(`${name} must be an object.`);
  if (Object.keys(value).some(key => !fields.includes(key)))
    invalid(`${name} contains unsupported fields.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, pattern: RegExp, name: string, limit: number): string {
  if (typeof value !== 'string' || value.length > limit || value.trim() !== value || !pattern.test(value))
    invalid(`Invalid ${name}.`);
  return value;
}

/**
 * Validate and copy public payment fields without normalizing or rounding them.
 * This does not authenticate the service or authorize spending. The wallet
 * checks the profile and prepared intent again before requesting approval.
 */
export function validateSponsoredPrivacyTransactionRequest(
  value: unknown,
): SponsoredPrivacyTransactionRequest {
  const request = object(value, [
    'protocol', 'apiBase', 'campaignId', 'rulesHash', 'intentId', 'token', 'payment',
  ], 'Sponsored privacy transaction');
  if (request.protocol !== 'plabs-custody-v1') invalid('Unsupported sponsored privacy protocol.');
  const apiBase = text(
    request.apiBase,
    /^https:\/\/app\.plabs\.online\/nft-[a-z0-9]+(?:-[a-z0-9]+)*\/v1$/,
    'custody API base URL',
    200,
  );
  const campaignId = text(request.campaignId, /^[a-z0-9-]{1,64}$/, 'campaign ID', 64);
  const rulesHash = text(request.rulesHash, /^0x[0-9a-f]{64}$/i, 'rules hash', 66);
  const intentId = text(request.intentId, /^0x[0-9a-f]{64}$/i, 'intent ID', 66);
  const token = text(request.token, /^\S+$/, 'service session token', 16384);
  const payment = object(request.payment, [
    'chainId', 'poolAddress', 'recipientRaw', 'amountRaw', 'memoPrefixHex',
  ], 'Sponsored payment');
  if (payment.chainId !== 143) invalid('Sponsored privacy transfers require Monad mainnet (143).');
  const poolAddress = text(payment.poolAddress, /^0x[0-9a-f]{40}$/i, 'payment pool address', 42);
  const recipientRaw = text(payment.recipientRaw, /^[0-9a-f]{86}$/i, 'raw privacy recipient', 86);
  const amountRaw = text(payment.amountRaw, /^[1-9][0-9]{0,15}$/, 'base-unit payment amount', 16);
  if (BigInt(amountRaw) > BigInt(Number.MAX_SAFE_INTEGER))
    invalid('The sponsored payment amount exceeds the supported safe integer range.');
  const memoPrefixHex = text(payment.memoPrefixHex, /^0x(?:[0-9a-f]{2}){1,128}$/i, 'memo prefix', 258);
  return {
    protocol: 'plabs-custody-v1', apiBase, campaignId, rulesHash, intentId, token,
    payment: { chainId: 143, poolAddress, recipientRaw, amountRaw, memoPrefixHex },
  };
}
