# Changelog

## 0.2.0

- Publish the standalone SDK as `plabs-js-sdk`; this repository is the shared source for PLabs Network and the wallet extension.
- Include scoped privacy reads, session metadata, balances, history, notes and DEX order summaries.
- Include intent-only PEX placement, resume, cancellation/recovery and payout collection (extension 0.7.0+).
- Include explicit combined connection/read consent via `connect({ privacyScopes })` and the `unifiedConnect` capability (extension 0.8.0+). Plain `connect()` remains EVM-only.
- Ship zero-runtime-dependency ESM, CommonJS and TypeScript declarations.
- Add tag-driven GitHub Releases, package verification and opt-in npm publishing with provenance.
