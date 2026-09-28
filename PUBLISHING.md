# Releases and npm publishing

The standalone repository is the only SDK source. Network and extension consume the same package.

## Version tracking

`.github/workflows/release.yml` validates every main-branch push and pull request. A `v*` tag additionally creates a GitHub Release with the verified npm tarball and SHA256SUMS. The tag must exactly match package.json, package-lock.json and a CHANGELOG.md entry. Only stable versions are accepted.

```sh
npm ci
node scripts/check-release.mjs
npm pack
node scripts/check-package.mjs
# Commit the release changes before tagging.
git tag -a v0.2.0 -m 'Release plabs-js-sdk 0.2.0'
git push origin main v0.2.0
```

Do not move a published tag. Bump the version for subsequent changes. Re-running a release preserves existing GitHub release assets; npm rejects an already-published version.

## Enable npm publication

GitHub releases work without npm credentials. npm publication is gated by the repository Actions variable `NPM_PUBLISH_ENABLED=true`; leave it unset while bootstrapping. No npm token is stored in this repository.

For the first publication, configure repository Actions secret `NPM_TOKEN` with a valid granular npm token allowed to create/publish this package and bypass publishing 2FA. Alternatively, publish the release tarball interactively after `npm login`. Do not send tokens in chat.

For subsequent releases, configure npm Trusted Publisher on the `plabs-js-sdk` package:

- GitHub owner: `1inxe`
- Repository: `plabs-js-sdk`
- Workflow filename: `release.yml`
- Environment: leave empty
- Allow direct `npm publish`

Then remove the bootstrap `NPM_TOKEN` secret. The workflow uses Node 24, npm's OIDC authentication, `id-token: write` and provenance. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

After configuring authentication and `NPM_PUBLISH_ENABLED=true`, re-run the tag workflow with **Re-run all jobs**, or select the existing version tag in **Run workflow**. Do not run publication against main. Publication uses the exact artifact validated by the build job.

Before registry publication, consumers use `vendor/plabs-js-sdk-0.2.0.tgz`. After publication, run `pnpm add --save-exact plabs-js-sdk@0.2.0` in both consumers and commit their regenerated lockfiles. Never reintroduce an embedded SDK source copy.
