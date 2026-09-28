# SDK 源码与 npm 发布

这是可独立维护的 SDK 源码目录，不依赖插件项目的目录结构。

- 包名：`plabs-wallet-sdk`
- 当前版本：`0.1.0`
- 入口源码：`src/index.ts`
- EVM 接口：`src/chains/evm/api.ts`
- 隐私接口：`src/chains/privacy/api.ts`
- 构建脚本：`scripts/build.mjs`
- 上游来源及许可证：`UPSTREAM.md`、`NOTICE.md`、`LICENSE`、`LICENSE.upstream`

## 构建与打包

```bash
npm install
npm run build
npm pack
```

`dist/esm`、`dist/cjs` 包含运行文件及类型声明。`npm pack` 会先重新构建，生成 `plabs-wallet-sdk-0.1.0.tgz`，可以拿到其他网站项目本地安装：

```bash
npm install /Users/moli/Workspace/Blockchain/brush/plabs-wallet-sdk/plabs-wallet-sdk-0.1.0.tgz
```

SDK 没有运行时依赖；开发构建依赖 TypeScript。包内只包含 package.json 的 files 白名单内容，不包含 node_modules、本地环境文件或发布凭据。

## 发布 npm

使用有发布权限的 npm 账号登录。当前包名为不带 scope 的 `plabs-wallet-sdk`，无需创建 npm 组织。配置真实仓库地址时再添加 repository/homepage 字段。

```bash
npm login
npm whoami
npm publish --access public
```

不要覆盖 npm 上已经存在的版本；后续发布前修改 package.json 的 version。需要版本递增时可使用 `npm version patch --no-git-tag-version`，再按自己的 Git 工作流提交。

发布凭据由 npm 登录流程管理，不放入源码或安装包。发布结果以 npm registry 为准。

## 与插件的关系

后续在本目录维护 SDK。插件项目原有 `packages/plabs-wallet-sdk` 保留为其当前集成副本，不会自动跟随这里的修改。SDK 版本更新后，在插件/演示网站更新依赖或安装新的 tarball 即可。

本次只安装构建依赖、编译并打包，未运行自动测试或真实交易。
