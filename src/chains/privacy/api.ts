import { BaseAPI } from '../../base-api.js';
import { invalid, privacyAddress, privacyParams } from '../../validation.js';
import type { PlabsPrivacyPoolParams, PlabsPrivacySendParams, PrivacyAddress, PrivacyTransactionResult } from '../../types.js';
export class PrivacyAPI extends BaseAPI {
  /** Separate disclosure approval; EVM connection alone never shares this address. */
  getAddress(): Promise<PrivacyAddress> { return this.request('plabs_getPrivacyAddress'); }
  /** Requests authorization, proving, final confirmation and submission in the wallet. */
  async sendTransaction(params: PlabsPrivacySendParams): Promise<PrivacyTransactionResult> {
    const normalized = privacyParams(params, true);
    return this.request('plabs_sendPrivacyTransaction', [{ ...normalized, kind: 'send', recipient: privacyAddress(params.to) }]);
  }
  async shield(params: PlabsPrivacyPoolParams): Promise<PrivacyTransactionResult> {
    return this.request('plabs_sendPrivacyTransaction', [{ ...privacyParams(params), kind: 'shield' }]);
  }
  async unshield(params: PlabsPrivacyPoolParams): Promise<PrivacyTransactionResult> {
    return this.request('plabs_sendPrivacyTransaction', [{ ...privacyParams(params), kind: 'unshield' }]);
  }
  /** Only requests created by this origin/account in the current browser session. */
  async getTransactionStatus(id: string): Promise<PrivacyTransactionResult> {
    if (typeof id !== 'string' || !id || id.length > 256) invalid('An operation id returned by this wallet is required.');
    return this.request('plabs_getTransactionStatus', [id]);
  }
}
