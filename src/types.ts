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
  methods: { personalSign: boolean; signTypedData: boolean; evmTransactions: boolean; evmPreview: boolean; privacyTransactions: boolean };
  networks: Array<{ chainId: number; name: string; nativeSymbol: string; pools: Array<{ address: string; symbol: string; canShield: boolean; canUnshield: boolean }> }>;
}
export interface WalletConnection { accounts: string[]; chainId: HexChainId }
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
export interface PrivacyAddress { address: string; chainId: HexChainId }
export interface PrivacyTransactionRequest {
  kind: 'send' | 'shield' | 'unshield';
  chainId: HexChainId;
  poolAddress: string;
  amount: string;
  recipient?: string;
  feePool?: string;
}
export interface PrivacyTransactionResult { id: string; state: 'pending' | 'confirmed' | 'failed'; txHash?: string; message?: string }
