# plabs-js-sdk

[English](README.md) | **简体中文**

用于网站接入 [PLabs Wallet](https://github.com/1inxe/plabs-wallet) 浏览器扩展的 TypeScript SDK。通过钱包连接账户、读取已授权的余额与历史、发起隐私转账以及管理 PEX 订单。

无运行时依赖，提供 ESM、CommonJS 和 TypeScript 类型声明。密钥、证明生成和交易审批均由扩展管理。

## 安装

```sh
npm install plabs-js-sdk
```

如果注册表中尚无此包，可从本地源码构建，需要 Node.js 18 或更高版本：

```sh
npm ci
npm run build
npm pack
```

在应用中安装生成的包：`npm install /path/to/plabs-js-sdk-0.2.0.tgz`。

## 连接钱包

安装并解锁 PLabs Wallet，从应用的连接按钮调用：

```ts
import { getPlabsWallet } from "plabs-js-sdk";

const wallet = getPlabsWallet();
if (!wallet) throw new Error("请安装 PLabs Wallet 并刷新页面");

const { accounts, chainId } = await wallet.connect();
console.log(accounts, chainId);
```

扩展不可用或处于 SSR 环境时，`getPlabsWallet()` 返回 `null`。SSR 环境可以安全导入本包。需要等待 provider 注入时：

```ts
import { createPlabsWallet, detectPlabsProvider } from "plabs-js-sdk";

const provider = await detectPlabsProvider({ timeoutMs: 3000 });
const wallet = createPlabsWallet(provider);
```

钱包选择器可使用 `discoverPlabsWallets(callback)`，关闭时调用其返回的清理函数。

## 读取余额和历史

通过 `wallet.capabilities()` 获取当前扩展支持的方法、网络和池。隐私读取需要明确授权；支持 `methods.unifiedConnect` 时，可在连接时一并申请：

```ts
const connection = await wallet.connect({
  privacyScopes: ["address", "balances", "history"],
});
console.log(connection.privacy?.address);

const balances = await wallet.privacy.getBalances();
const history = await wallet.privacy.getHistory({ page: 1, pageSize: 20 });
```

也可以先调用 `wallet.connect()`，再调用 `wallet.privacy.requestAccess(["address", "balances", "history"])`。可用范围包括 `address`、`balances`、`history`、`notes` 和 `dexOrders`。用 `getSession()` 读取当前隐私会话，用 `revokeAccess()` 撤销授权。

余额使用原始十进制整数字符串；尚未扫描的隐私余额可能为 `null`。历史包含钱包操作和收到的 Notes。分页大小支持 10、20 或 50，可选用 `poolAddress` 筛选。

## 转账、存入和提取

使用 `capabilities()` 返回的网络和池，并单独取得收款人的隐私地址。将以下函数接入转账表单：

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

`sendTransaction` 接受 `{ chainId, poolAddress, to, amount, feePool? }`。`chainId` 使用数字或十六进制字符串，`amount` 使用 `"1.5"` 这样的十进制字符串。

`shield` 和 `unshield` 接受相同参数，但不接受 `to`，目标绑定到当前钱包账户。`getAddress()` 请求分享用户的隐私收款地址。交易需要钱包批准，连接账户本身不会授权转账。交易状态查询限于当前浏览器会话内发起请求的网站和账户。

## 赞助托管付款

此接口已加入源码，将随下一版 SDK 发布。当前包版本仍为 `0.2.0`，已有 npm 安装不包含这些新增接口。可在本地构建此仓库使用类型化方法，并在展示付款入口前检查当前扩展的能力声明。

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
    throw new Error("请更新 PLabs Wallet 以使用赞助隐私转账");
  }
  return wallet.privacy.sendSponsoredTransaction(
    validateSponsoredPrivacyTransactionRequest(request),
  );
}
```

从用户明确点击的付款或恢复按钮调用上述方法。`sendSponsoredTransaction` 校验以下公开字段后调用 `plabs_sendSponsoredPrivacyTransaction`：

| 字段 | 约定 |
| --- | --- |
| `protocol` | `"plabs-custody-v1"` |
| `apiBase` | 规范地址 `https://app.plabs.online/nft-<scope>/v1`，最长 200 字符；scope 为小写字母/数字组成的段，以单个连字符分隔；不接受查询参数、fragment、用户名密码、端口或末尾斜杠 |
| `campaignId` | 1–64 个小写字母、数字或连字符 |
| `rulesHash`、`intentId` | `0x` 加 32 字节十六进制 |
| `token` | 非空且无空白字符的服务会话 token，仅保存在内存 |
| `payment.chainId` | `143` |
| `payment.poolAddress` | `0x` 加 20 字节十六进制 |
| `payment.recipientRaw` | 不带 `0x` 的 43 字节十六进制隐私地址 |
| `payment.amountRaw` | 正整数基础单位**字符串**，范围为 `"1"` 至 `"9007199254740991"`；不接受小数、科学计数法或前导零 |
| `payment.memoPrefixHex` | `0x` 加 1–128 个完整的十六进制字节 |

额外字段会被拒绝。校验返回独立对象，保留付款字符串原值，不请求服务、不生成证明、不保存 token，也不授权支出。钱包独立校验服务配置与已准备的付款意图，验证当前钱包身份，并请求用户批准。密钥、证明和隐私 Notes 均留在扩展内。

结果为 `{ id, intentId, state, jobId?, txHash?, message? }`，其中 `state` 为 `pending`、`confirmed` 或 `failed`。恢复待处理请求时，保留原有 intent 和全部付款字段，向同一方法重传相同请求。钱包恢复原交易，并拒绝该 intent 下被更改的付款条件。SDK 不自动重试或创建另一笔付款。仅有公开交易哈希不代表活动已经接受该付款，应结合返回状态与服务状态判断。

这两个类型及校验函数同时从 `plabs-js-sdk` 和 `plabs-js-sdk/chains/privacy` 导出。采用此托管协议的不同活动共用同一方法，无需为每个活动增加专用 SDK 接口。

## PEX 订单

当 `capabilities().methods.dexTrading` 启用时，可调用 `wallet.privacy.placeDexOrder(intent)`，参数如下：

| 字段 | 值 |
| --- | --- |
| `chainId` | `"0x8f"` |
| `side` | `"buy"` 或 `"sell"` |
| `type` | `"limit"` 或 `"market"` |
| `quantityRaw`、`priceTicks`、`maxFeeRaw` | 按 PEX 单位传入正整数字符串，每项不得超过 JavaScript 安全整数范围 |

`getDexOrders()` 需要 `dexOrders` 授权。`importOfficialDexOrders()` 经钱包批准后导入官方订单引用。使用钱包返回的本地订单 ID 调用 `resumeDexOrder(id)`、`cancelDexOrder(id)` 和 `collectDexPayouts(id)`。

## EVM 方法与事件

| 方法 | 用途 |
| --- | --- |
| `wallet.getAccounts()` | 静默读取已授权的公开账户 |
| `wallet.evm.getChainId()` | 获取当前十六进制链 ID |
| `wallet.evm.switchChain(chainId)` | 请求切换到支持的网络 |
| `wallet.evm.signMessage(text, address?)` | 请求公开 EVM 消息签名 |
| `wallet.evm.previewTransaction(tx)` | 预览 EVM 交易，不广播 |
| `wallet.open()` | 打开钱包弹窗 |
| `wallet.disconnect()` | 撤销当前网站的账户权限 |

```ts
const unsubscribe = wallet.subscribe("accountsChanged", (accounts) => {
  console.log(accounts);
});

// 组件卸载时：
unsubscribe();
```

`wallet`、`wallet.evm` 和 `wallet.privacy` 均提供 `subscribe`、`on` 和 `removeListener`，支持 `accountsChanged`、`chainChanged` 等事件。断开连接不会取消已提交的交易。

## 错误处理

```ts
import { PlabsWalletError, PLABS_ERROR_CODES } from "plabs-js-sdk";

try {
  await wallet.connect();
} catch (error) {
  if (
    error instanceof PlabsWalletError &&
    error.code === PLABS_ERROR_CODES.USER_REJECTED
  ) {
    console.log("请求已取消");
  } else {
    throw error;
  }
}
```

常见错误码：`4001` 用户拒绝、`4100` 未授权、`4200` 不支持、`4900` 断开连接、`-32602` 参数无效、`-32002` 已有待处理请求。交易提交报错后，先检查钱包历史再决定是否重试。

可复用的连接与转账函数见 [examples/connect-and-send.ts](examples/connect-and-send.ts)。

执行 `npm test` 会构建 ESM、CommonJS 和类型声明，再运行本地赞助付款契约测试。测试仅使用合成 provider，不请求网络或进行真实付款。

## 许可证

[MIT](LICENSE)。基于 Noir Wallet SDK 改编，来源信息保留在 [NOTICE.md](NOTICE.md) 和 [LICENSE.upstream](LICENSE.upstream)。

### 白名单所有权证明

钱包声明 `capabilities.methods.privacyOwnership` 后，可调用 `sdk.privacy.proveOwnership(message, privacyAddress)`。该操作单独请求用户批准，返回 `bjj-schnorr-v1` 公共证明，不导出隐私密钥。`getAddress()` 的可选 `rawAddress` 字段可用于官网白名单挑战接口。消息最多 8192 字符，地址必须与当前隐私账户一致。此接口已加入源码，需发布新版 SDK 后供 npm 使用者升级。

### 隐私 NFT mint

新钱包通过 `methods.nftMinting` 声明支持能力。`wallet.privacy.mintNft({chainId: 1, poolAddress})` 发起已验证 Ethereum 免费合集的铸造；预留/证明和最终 ETH Gas 分别确认。`getNftMints()` 仅读取当前网站的公开 mint 记录，`resumeNftMint(id)` 恢复原预留和证明，或核对已保存的原交易哈希。证明、私有 Note 和原始签名不返回网页。拒绝其他网络、付费发售、任意 calldata 和收款地址覆盖。源码已提供方法；使用现有 npm 版本的前端可先直接桥接同名 provider RPC。
