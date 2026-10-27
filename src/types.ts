// Adapted from Noir Wallet SDK's typed provider surface. See NOTICE.md.
export type HexChainId = `0x${string}`;
export type ChainIdInput = HexChainId | number;
export type ProviderListener = (...args: unknown[]) => void;
export interface RequestArguments { method: string; params?: unknown[] | Record<string, unknown> }
export interface PlabsProvider {
  readonly isPlabsWallet?: boolean;
  readonly version?: string;
  request(args: RequestArguments): Promise<unknown>;
  on(event: string, listener: ProviderListener): unknown;
  removeListener(event: string, listener: ProviderListener): unknown;
}
export interface ProviderConnectInfo { chainId: HexChainId }
export interface ProviderMessage { type: string; data: unknown }
export interface ProviderRpcError extends Error { code: number; data?: unknown }
export interface PlabsEvents {
  accountsChanged: string[];
  chainChanged: HexChainId;
  connect: ProviderConnectInfo;
  disconnect: ProviderRpcError;
  message: ProviderMessage;
}
export interface PlabsWalletInfo { uuid: string; name: string; icon: string; rdns: string }
export interface DiscoveredPlabsWallet { info: PlabsWalletInfo; provider: PlabsProvider }
export interface PlabsCapabilities {
  version: 1;
  methods: { personalSign: boolean; signTypedData: boolean; evmTransactions: boolean; evmPreview: boolean; privacyTransactions: boolean; privacyRead?: boolean; privacyHistory?: boolean; privacyNotes?: boolean; dexOrders?: boolean; dexTrading?: boolean; unifiedConnect?: boolean; privacyOwnership?: boolean; sponsoredPrivacyTransfers?: boolean; nftMinting?: boolean; nftAssets?: boolean };
  networks: Array<{ chainId: number; name: string; nativeSymbol: string; pools: Array<{ address: string; symbol: string; canShield: boolean; canUnshield: boolean; decimals?: number; underlying?: string }> }>;
}
export interface WalletConnection { accounts: string[]; chainId: HexChainId; privacy?: PrivacySession }
export interface WalletPermission { invoker: string; parentCapability: string; caveats?: Array<{ type: string; value: unknown }> }
export interface EvmTransactionRequest { from: string; to: string; value: `0x${string}`; data?: `0x${string}`; chainId?: HexChainId }
export interface EvmTransactionPreview extends EvmTransactionRequest { approved: true; broadcast: false; chainId: HexChainId }
export interface PlabsPrivacySendParams {
  chainId: ChainIdInput;
  poolAddress: string;
  to: string;
  /** Decimal token amount; never pass a JavaScript floating-point number. */
  amount: string;
  feePool?: string;
}
export type PlabsPrivacyPoolParams = Omit<PlabsPrivacySendParams, 'to'>;
export interface PrivacyAddress { address: string; rawAddress?: string; chainId: HexChainId }
export interface PrivacyTransactionRequest {
  kind: 'send' | 'shield' | 'unshield';
  chainId: HexChainId;
  poolAddress: string;
  amount: string;
  recipient?: string;
  feePool?: string;
}
export interface PrivacyTransactionResult { id: string; state: 'pending' | 'confirmed' | 'failed'; txHash?: string; message?: string }
/** Reviewed Ethereum free-mint intent. The wallet selects the edition and creates its private Note. */
export interface NftMintRequest { chainId: 1; poolAddress: string }
/** Public status only. NFT proofs, note openings and signatures never enter this result. */
export interface NftMintResult {
  id: string; chainId: 1; poolAddress: string; name: string; symbol: string; tokenId?: string;
  state: 'pending' | 'confirmed' | 'failed'; stage: string; createdAt: number;
  txHash?: string; canResume: boolean; message?: string;
}

/** Shared only after a separate `nfts` read permission. No Note openings or spending keys. */
export interface NftAsset {
  id: string; chainId: 1; type: 'perc721'; poolAddress: string; name: string; symbol: string;
  tokenId: string; txHash: string; blockNumber: number; state: 'confirmed' | 'pending'; source: 'chain' | 'mint';
}
export interface NftAssetSnapshot {
  chainId: 1; items: NftAsset[]; syncedAt: number | null; syncComplete: boolean; error?: string; progress?: string;
}

/** Public payment intent; the wallet independently authenticates and verifies its custody service. */
export interface SponsoredPrivacyTransactionRequest {
  protocol: 'plabs-custody-v1';
  /** Canonical HTTPS endpoint: https://app.plabs.online/nft-<scope>/v1. */
  apiBase: string;
  campaignId: string;
  rulesHash: string;
  intentId: string;
  /** Keep this short-lived service token in memory only. */
  token: string;
  payment: {
    chainId: 143;
    poolAddress: string;
    /** A 43-byte hexadecimal privacy address without a 0x prefix. */
    recipientRaw: string;
    /** Positive base-unit integer string, at most Number.MAX_SAFE_INTEGER. */
    amountRaw: string;
    /** 0x-prefixed bytes, from 1 to 128 bytes. */
    memoPrefixHex: string;
  };
}

/** Public operation status only: no proofs, wallet keys or private notes. */
export interface SponsoredPrivacyTransactionResult {
  id: string;
  intentId: string;
  state: 'pending' | 'confirmed' | 'failed';
  jobId?: string;
  txHash?: string;
  message?: string;
}

/** Each scope is approved for one site, account, network and unlocked privacy session. */
export type PrivacyReadScope = 'address' | 'balances' | 'history' | 'notes' | 'dexOrders' | 'nfts';
export interface PrivacySession { version: 1; chainId: HexChainId; address?: string; scopes: PrivacyReadScope[]; expiresAt?: number; remembered?: boolean }
export interface PublicBalance { chainId: number; type: 'native' | 'erc20'; address: string | null; symbol: string; decimals: number; balanceRaw: string }
export interface ShieldedBalance {
  chainId: number; poolAddress: string; symbol: string; decimals: number;
  totalRaw: string | null; spendableRaw: string | null; pendingRaw: string | null;
  totalNotes: number; spendableNotes: number; syncState: 'partial' | 'complete' | 'error' | 'unavailable'; syncedAt: number | null;
}
export interface WalletPortfolio {
  chainId: HexChainId; privacyAddress: string; fetchedAt: number;
  public: { assets: PublicBalance[]; error?: string };
  private: { assets: ShieldedBalance[]; error?: string };
}
export interface PrivacyHistoryEntry {
  id: string; chainId: number; kind: 'send' | 'shield' | 'unshield' | 'merge' | 'receive' | 'unknown';
  status: 'pending' | 'confirmed' | 'failed' | 'review'; symbol: string; decimals: number;
  amountRaw?: string; recipient?: string; poolAddress?: string; txHash?: string;
  createdAt: number | null; blockNumber?: number; source: 'wallet' | 'received-note';
}
export interface PrivacyHistoryPage { items: PrivacyHistoryEntry[]; page: number; pageSize: number; total: number; pages: number; coverage: 'wallet-and-received-notes'; syncComplete: boolean }
export interface PrivacyNote { id: string; poolAddress: string; symbol: string; decimals: number; valueRaw: string; confirmed: boolean; spent: boolean; txHash?: string; blockNumber: number }
export interface PrivacyNotes { items: PrivacyNote[]; page: number; pageSize: number; total: number; pages: number }
export interface PrivacyPageParams { page?: number; pageSize?: number; poolAddress?: string }
export interface DexOrderIntent { chainId: '0x8f'; side: 'buy' | 'sell'; type: 'limit' | 'market'; quantityRaw: string; priceTicks: string; maxFeeRaw: string }
export interface DexOrderSummary { id: string; side: 'buy' | 'sell'; type: 'limit' | 'market'; quantityRaw: string; priceTicks: string; createdAt: number; epoch: string; status: 'open' | 'filled' | 'pending' | 'not-found' | 'previous-epoch' | 'unavailable' | 'recovered'; matchedRaw: string | null; pendingRaw: string | null; remainingRaw: string | null; localId?: string; managed?: boolean; executionState?: 'prepared' | 'funding' | 'funded' | 'submitting' | 'open' | 'canceling' | 'recovering' | 'recovered' | 'discarded'; canResume?: boolean; canCancel?: boolean; error?: string; executionActive?: boolean; transactionFailed?: boolean; fundingProgress?: { asset: string; state: 'prepared' | 'confirming' | 'indexing' | 'confirmed' | 'failed' }[] }
export interface DexOrders { orders: DexOrderSummary[]; source: 'official-matcher'; importedAt: number | null; fetchedAt: number; needsImport: boolean; canPlaceOrders: boolean; error?: string }

/** Public proof only; privacy keys remain inside the wallet. */
export type PrivacyOwnershipProof = { version: 'bjj-schnorr-v1'; r_x_hex: string; r_y_hex: string; s_hex: string };
