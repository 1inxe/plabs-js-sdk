import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createPlabsWallet, PLABS_ERROR_CODES, PlabsWalletError, validateSponsoredPrivacyTransactionRequest } from '../dist/esm/index.js';
import { PrivacyAPI, validateSponsoredPrivacyTransactionRequest as validatePrivacyExport } from '../dist/esm/chains/privacy/index.js';

const request = (scope = 'alpha') => ({
  protocol: 'plabs-custody-v1',
  apiBase: `https://app.plabs.online/nft-${scope}/v1`,
  campaignId: `${scope}-test-20261020`,
  rulesHash: `0x${'ab'.repeat(32)}`,
  intentId: `0x${(scope === 'alpha' ? '12' : '34').repeat(32)}`,
  token: `synthetic-${scope}-session`,
  payment: {
    chainId: 143,
    poolAddress: `0x${'aB'.repeat(20)}`,
    recipientRaw: 'cD'.repeat(43),
    amountRaw: '9007199254740991',
    memoPrefixHex: '0x706c6162732d637573746f64792d7631',
  },
});
function harness(respond) {
  const calls = [];
  const provider = {
    isPlabsWallet: true,
    async request(args) {
      calls.push(args);
      return respond ? respond(args) : { id: 'operation-1', intentId: args.params[0].intentId, state: 'pending', jobId: 'job-1' };
    },
    on() {},
    removeListener() {},
  };
  return { wallet: createPlabsWallet(provider), calls, provider };
}

test('the generic method forwards exact reviewed payment fields without number conversion', async () => {
  const h = harness();
  const input = request();
  const output = await h.wallet.privacy.sendSponsoredTransaction(input);
  assert.deepEqual(h.calls, [{ method: 'plabs_sendSponsoredPrivacyTransaction', params: [input] }]);
  assert.equal(h.calls[0].params[0].payment.amountRaw, '9007199254740991');
  assert.equal(h.calls[0].params[0].payment.poolAddress, input.payment.poolAddress);
  assert.notEqual(h.calls[0].params[0], input);
  assert.notEqual(h.calls[0].params[0].payment, input.payment);
  assert.deepEqual(output, { id: 'operation-1', intentId: input.intentId, state: 'pending', jobId: 'job-1' });
  assert.ok(h.wallet.privacy instanceof PrivacyAPI);
});

test('different synthetic campaigns use the same protocol method and remain independent', async () => {
  const h = harness();
  const alpha = request('alpha');
  const beta = request('beta');
  beta.payment.amountRaw = '1';
  beta.payment.memoPrefixHex = '0xff';
  for (const input of [alpha, beta, alpha]) await h.wallet.privacy.sendSponsoredTransaction(input);
  assert.deepEqual(h.calls.map((call) => call.method), Array(3).fill('plabs_sendSponsoredPrivacyTransaction'));
  assert.deepEqual(h.calls.map((call) => call.params[0]), [alpha, beta, alpha]);
  assert.equal(h.calls[0].params[0].intentId, h.calls[2].params[0].intentId);
  assert.equal(h.calls[0].params[0].payment.amountRaw, h.calls[2].params[0].payment.amountRaw);
});

test('URL validation rejects alternate hosts, credentials, redirects, query data and noncanonical paths before RPC', async () => {
  const h = harness();
  for (const apiBase of [
    'http://app.plabs.online/nft-alpha/v1',
    'https://example.com/nft-alpha/v1',
    'https://app.plabs.online.evil.invalid/nft-alpha/v1',
    'https://app.plabs.online@evil.invalid/nft-alpha/v1',
    'https://user@app.plabs.online/nft-alpha/v1',
    'https://app.plabs.online:443/nft-alpha/v1',
    'https://app.plabs.online/nft-alpha/v1?token=secret',
    'https://app.plabs.online/nft-alpha/v1#fragment',
    'https://app.plabs.online/nft-alpha/v1/',
    'https://app.plabs.online/nft-alpha/v1\n',
    'https://app.plabs.online/nft-alpha/../v1',
    'https://app.plabs.online/nft-alpha%2fv1',
    'https://app.plabs.online/nft-alpha\\v1',
    'https://app.plabs.online/nft-alpha/v2',
    'https://app.plabs.online/nft-/v1',
    'https://app.plabs.online/nft-alpha--beta/v1',
    'https://app.plabs.online/nft-alpha-/v1',
    `https://app.plabs.online/nft-${'a'.repeat(201)}/v1`,
    '/nft-alpha/v1',
    ' https://app.plabs.online/nft-alpha/v1',
  ]) {
    await assert.rejects(h.wallet.privacy.sendSponsoredTransaction({ ...request(), apiBase }), (error) => error.code === PLABS_ERROR_CODES.INVALID_PARAMS, apiBase);
  }
  assert.equal(h.calls.length, 0);
});

test('base-unit amount validation rejects unsafe or ambiguous representations and accepts both bounds', async () => {
  const h = harness();
  for (const amountRaw of [0, 100000000, 1n, '0', '-1', '+1', '01', '1.0', '1e6', '1 000', ' 1', '1 ', 'NaN', '9007199254740992', '18446744073709551615', '9'.repeat(10000)]) {
    const input = request();
    input.payment.amountRaw = amountRaw;
    await assert.rejects(h.wallet.privacy.sendSponsoredTransaction(input), (error) => error.code === PLABS_ERROR_CODES.INVALID_PARAMS);
  }
  assert.equal(h.calls.length, 0);
  for (const amountRaw of ['1', '9007199254740991']) {
    const input = request();
    input.payment.amountRaw = amountRaw;
    await h.wallet.privacy.sendSponsoredTransaction(input);
    assert.equal(h.calls.at(-1).params[0].payment.amountRaw, amountRaw);
  }
});

test('memo prefixes must contain between one and 128 complete hex bytes', async () => {
  const h = harness();
  for (const memoPrefixHex of ['', '0x', 'ff', '0x1', '0x001', '0xzz', '0xff\n', `0x${'ab'.repeat(129)}`, undefined, 123]) {
    const input = request();
    input.payment.memoPrefixHex = memoPrefixHex;
    await assert.rejects(h.wallet.privacy.sendSponsoredTransaction(input), (error) => error.code === PLABS_ERROR_CODES.INVALID_PARAMS);
  }
  assert.equal(h.calls.length, 0);
  const input = request();
  input.payment.memoPrefixHex = `0x${'aB'.repeat(128)}`;
  await h.wallet.privacy.sendSponsoredTransaction(input);
  assert.equal(h.calls[0].params[0].payment.memoPrefixHex, input.payment.memoPrefixHex);
});

test('invalid identity, protocol and payment structures fail locally without leaking arbitrary fields', async () => {
  const h = harness();
  for (const mutate of [
    (value) => { value.protocol = 'other'; },
    (value) => { value.campaignId = ''; },
    (value) => { value.campaignId = '../alpha'; },
    (value) => { value.campaignId = 'a'.repeat(65); },
    (value) => { value.rulesHash = '0x12'; },
    (value) => { value.intentId = 'not-an-id'; },
    (value) => { value.token = ''; },
    (value) => { value.token = 'contains whitespace'; },
    (value) => { value.token = 'valid-looking-token\n'; },
    (value) => { value.token = 'a'.repeat(16385); },
    (value) => { value.payment.chainId = 10143; },
    (value) => { value.payment.chainId = '0x8f'; },
    (value) => { value.payment.poolAddress = '0x1234'; },
    (value) => { value.payment.recipientRaw = `0x${'ab'.repeat(43)}`; },
    (value) => { value.payment.recipientRaw = 'ab'.repeat(42); },
    (value) => { value.payment.proof = 'untrusted'; },
    (value) => { value.seed = 'untrusted'; },
    (value) => { value.payment = []; },
    (value) => { delete value.payment; },
  ]) {
    const input = request();
    mutate(input);
    await assert.rejects(h.wallet.privacy.sendSponsoredTransaction(input), (error) => error.code === PLABS_ERROR_CODES.INVALID_PARAMS);
  }
  for (const input of [null, undefined, [], 'request'])
    await assert.rejects(h.wallet.privacy.sendSponsoredTransaction(input), (error) => error.code === PLABS_ERROR_CODES.INVALID_PARAMS);
  assert.equal(h.calls.length, 0);
});

test('RPC error codes, messages and data are preserved without automatic retries', async () => {
  const cause = { code: 4001, message: 'User rejected sponsored transfer', data: { reason: 'declined' } };
  const h = harness(() => { throw cause; });
  await assert.rejects(h.wallet.privacy.sendSponsoredTransaction(request()), (error) => {
    assert.ok(error instanceof PlabsWalletError);
    assert.equal(error.code, cause.code);
    assert.equal(error.message, cause.message);
    assert.deepEqual(error.data, cause.data);
    assert.equal(error.originalError, cause);
    return true;
  });
  assert.equal(h.calls.length, 1);
});

test('validator is usable from root, privacy subpath and CommonJS without browser globals', () => {
  const input = request();
  assert.deepEqual(validateSponsoredPrivacyTransactionRequest(input), input);
  assert.deepEqual(validatePrivacyExport(input), input);
  const require = createRequire(import.meta.url);
  const cjsRoot = require('../dist/cjs/index.js');
  const cjsPrivacy = require('../dist/cjs/chains/privacy/index.js');
  assert.deepEqual(cjsRoot.validateSponsoredPrivacyTransactionRequest(input), input);
  assert.deepEqual(cjsPrivacy.validateSponsoredPrivacyTransactionRequest(input), input);
  assert.equal(typeof cjsPrivacy.PrivacyAPI.prototype.sendSponsoredTransaction, 'function');
});
