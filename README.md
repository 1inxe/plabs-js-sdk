# plabs-js-sdk

**English** | [简体中文](README.zh-CN.md)

TypeScript SDK for connecting websites to the [PLabs Wallet](https://github.com/1inxe/plabs-wallet) browser extension. Connect accounts, read authorized balances and history, request private transfers, and manage PEX orders through the wallet.

The package has no runtime dependencies and includes ESM, CommonJS and TypeScript declarations. Keys, proofs and transaction approvals stay in the extension.

## Install

```sh
npm install plabs-js-sdk
```

If the package is not available from your registry, build from a local checkout using Node.js 18 or later:

```sh
npm ci
npm run build
npm pack
```

Install the generated package in your application with `npm install /path/to/plabs-js-sdk-0.3.0.tgz`.

## Connect a wallet

Install and unlock PLabs Wallet, then call this from your application's Connect button:

```ts
import { getPlabsWallet } from "plabs-js-sdk";

const wallet = getPlabsWallet();
if (!wallet) throw new Error("Install PLabs Wallet and refresh the page");

const { accounts, chainId } = await wallet.connect();
console.log(accounts, chainId);
```

`getPlabsWallet()` returns `null` when the extension is unavailable or during SSR. Importing the package during SSR is safe. For delayed provider injection:

```ts
import { createPlabsWallet, detectPlabsProvider } from "plabs-js-sdk";

const provider = await detectPlabsProvider({ timeoutMs: 3000 });
const wallet = createPlabsWallet(provider);
```

For a wallet picker, use `discoverPlabsWallets(callback)` and call its returned cleanup function when the picker closes.

## Read balances and history

Check `wallet.capabilities()` for the connected extension's supported methods, networks and pools. Privacy reads require explicit scopes. If `methods.unifiedConnect` is supported, request them when connecting:

```ts
const connection = await wallet.connect({
  privacyScopes: ["address", "balances", "history"],
});
console.log(connection.privacy?.address);

const balances = await wallet.privacy.getBalances();
const history = await wallet.privacy.getHistory({ page: 1, pageSize: 20 });
```

Alternatively, call `wallet.connect()` followed by `wallet.privacy.requestAccess(["address", "balances", "history"])`. Available scopes are `address`, `balances`, `history`, `notes` and `dexOrders`. Use `getSession()` to read the current privacy session and `revokeAccess()` to revoke it.

Balances use raw decimal strings; unscanned private balances can be `null`. History includes wallet operations and received notes. Pagination accepts page sizes of 10, 20 or 50 and an optional `poolAddress` filter.

## Send, shield and unshield

Use a network and pool returned by `capabilities()`. Obtain the recipient's privacy address separately. Wire this function to your transfer form:

```ts
import type { PlabsPrivacySendParams } from "plabs-js-sdk";

async function sendPrivateTransfer(params: PlabsPrivacySendParams) {
  const result = await wallet.privacy.sendTransaction(params);
  if (result.state === "pending") {
    return wallet.privacy.getTransactionStatus(result.id);
  }
  return result;
}
```

`sendTransaction` accepts `{ chainId, poolAddress, to, amount, feePool? }`. Supply `chainId` as a number or hexadecimal string, and `amount` as a decimal string such as `"1.5"`.

`shield` and `unshield` accept the same parameters without `to`: destinations are bound to the current wallet account. `getAddress()` requests permission to share the user's privacy receiving address. Transfers require wallet approval; connection alone does not authorize them. Transaction status is scoped to the requesting site and account in the current browser session.

## Sponsored custody payments

Available in `plabs-js-sdk@0.3.0`. Install this release from npm and check the connected extension's capability before offering sponsored payments.

```ts
import {
  validateSponsoredPrivacyTransactionRequest,
  type SponsoredPrivacyTransactionRequest,
  type SponsoredPrivacyTransactionResult,
} from "plabs-js-sdk";

async function payPreparedIntent(
  request: SponsoredPrivacyTransactionRequest,
): Promise<SponsoredPrivacyTransactionResult> {
  const capabilities = await wallet.capabilities();
  if (!capabilities.methods.sponsoredPrivacyTransfers) {
    throw new Error("Update PLabs Wallet to enable sponsored privacy transfers");
  }
  return wallet.privacy.sendSponsoredTransaction(
    validateSponsoredPrivacyTransactionRequest(request),
  );
}
```

Call this helper from an explicit payment or resume action. `sendSponsoredTransaction` validates these public fields and calls `plabs_sendSponsoredPrivacyTransaction`:

| Field | Contract |
| --- | --- |
| `protocol` | `"plabs-custody-v1"` |
| `apiBase` | Canonical `https://app.plabs.online/nft-<scope>/v1`, at most 200 characters; scope uses lowercase letters/digits separated by single hyphens; no query, fragment, credentials, port or trailing slash |
| `campaignId` | 1–64 lowercase letters, digits or hyphens |
| `rulesHash`, `intentId` | `0x` followed by 32 hexadecimal bytes |
| `token` | Nonempty service session token without whitespace; keep it in memory only |
| `payment.chainId` | `143` |
| `payment.poolAddress` | `0x` followed by 20 hexadecimal bytes |
| `payment.recipientRaw` | 43 hexadecimal bytes without `0x` |
| `payment.amountRaw` | Positive base-unit **string**, from `"1"` through `"9007199254740991"`; no decimals, exponent or leading zeros |
| `payment.memoPrefixHex` | `0x` followed by 1–128 complete hexadecimal bytes |

Unknown fields are rejected. Validation returns a copy and preserves payment strings exactly. It does not fetch the service, generate a proof, save the token, or authorize spending. The wallet independently verifies the service profile and prepared intent, authenticates the current wallet identity, and requests payment approval. Keys, proofs and private notes remain in the extension.

The result contains `{ id, intentId, state, jobId?, txHash?, message? }`, where `state` is `pending`, `confirmed` or `failed`. Keep the original intent and payment fields when resuming a pending request: call the same method with the same request. The wallet resumes its saved transaction and rejects changed payment terms for that intent. The SDK does not automatically retry or create another payment. A public transaction hash alone does not imply campaign acceptance; use the returned state and service status.

The two types and validator are exported from both `plabs-js-sdk` and `plabs-js-sdk/chains/privacy`. Different campaigns using this custody protocol share the same method; no campaign-specific SDK method is required.

## PEX orders

When `capabilities().methods.dexTrading` is enabled, use `wallet.privacy.placeDexOrder(intent)`. Its fields are:

| Field | Value |
| --- | --- |
| `chainId` | `"0x8f"` |
| `side` | `"buy"` or `"sell"` |
| `type` | `"limit"` or `"market"` |
| `quantityRaw`, `priceTicks`, `maxFeeRaw` | Positive integer strings in PEX units, each within JavaScript's safe integer range |

`getDexOrders()` requires the `dexOrders` scope. `importOfficialDexOrders()` imports official order references with wallet approval. Use the local order ID returned by the wallet with `resumeDexOrder(id)`, `cancelDexOrder(id)` and `collectDexPayouts(id)`.

## EVM methods and events

| Method | Purpose |
| --- | --- |
| `wallet.getAccounts()` | Read authorized public accounts without prompting |
| `wallet.evm.getChainId()` | Read the current hexadecimal chain ID |
| `wallet.evm.switchChain(chainId)` | Request a supported chain |
| `wallet.evm.signMessage(text, address?)` | Request a public EVM message signature |
| `wallet.evm.previewTransaction(tx)` | Preview an EVM transaction; does not broadcast |
| `wallet.open()` | Open the wallet popup |
| `wallet.disconnect()` | Revoke this site's account permission |

```ts
const unsubscribe = wallet.subscribe("accountsChanged", (accounts) => {
  console.log(accounts);
});

// When the component is removed:
unsubscribe();
```

`subscribe`, `on` and `removeListener` are available on `wallet`, `wallet.evm` and `wallet.privacy`. Events include `accountsChanged` and `chainChanged`. Disconnecting does not cancel submitted transactions.

## Handle errors

```ts
import { PlabsWalletError, PLABS_ERROR_CODES } from "plabs-js-sdk";

try {
  await wallet.connect();
} catch (error) {
  if (
    error instanceof PlabsWalletError &&
    error.code === PLABS_ERROR_CODES.USER_REJECTED
  ) {
    console.log("Request cancelled");
  } else {
    throw error;
  }
}
```

Common codes: `4001` rejected, `4100` unauthorized, `4200` unsupported, `4900` disconnected, `-32602` invalid parameters, `-32002` request already pending. Check wallet history before retrying a failed transaction submission.

See [examples/connect-and-send.ts](examples/connect-and-send.ts) for reusable connection and transfer helpers.

Run `npm test` to build ESM/CommonJS/declarations and execute the local sponsored-payment contract tests. Tests use synthetic providers and make no network requests or real payments.

## License

[MIT](LICENSE). Adapted from Noir Wallet SDK; attribution is retained in [NOTICE.md](NOTICE.md) and [LICENSE.upstream](LICENSE.upstream).

### Private NFT mints

Updated wallets advertise `methods.nftMinting`. `wallet.privacy.mintNft({chainId: 1, poolAddress})` requests the reviewed Ethereum free-mint flow, with local proving, an initial reservation approval and a separate final ETH gas approval. `getNftMints()` reads this site's public mint records; `resumeNftMint(id)` resumes the original reservation/proof or checks its saved transaction hash. Proofs, Note openings and signatures remain inside the wallet. Paid drops, arbitrary calldata, recipient overrides and other networks are rejected. These methods and their request/result types are available in `plabs-js-sdk@0.3.0`, from both the package root and the privacy subpath.


### Private NFT holdings (0.3.1)

```ts
await wallet.privacy.requestAccess(['nfts']);
const cached = await wallet.privacy.getNftAssets();
const refreshed = await wallet.privacy.getNftAssets({ sync: true });
```

Check `capabilities.methods.nftAssets` before use. The separate `nfts` permission discloses collection names, token IDs and holding status for the current privacy account. Existing address/notes grants do not authorize NFT reads. Results include received NFTs and exclude spent Notes after a complete scan. Treat `syncComplete: false` as partial coverage; display the cached holdings and any sync error. A sync scans in the wallet and never signs or submits a transaction. No private keys or Note openings are returned.
