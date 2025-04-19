# リポジトリの構成

このリポジトリはpnpmのワークスペース機能を利用して、責任範囲ごとにパッケージを分割しています。

## パッケージ構成

- cdk

  - インフラ & バックエンドレイヤー
  - AWS CDKを使用したインフラストラクチャのコード化
  - API実装（AWS Lambda, API Gateway）

- web
  - フロントエンド
  - React/TypeScriptベースのSPA
  - コンポーネント構成
    - ホスト画面
    - コメント投稿画面
    - コメント管理画面

## 開発環境セットアップ

1. リポジトリのクローン

```bash
git clone https://github.com/seitamuro/live-comment.git
cd live-comment
```

2. 依存関係のインストール

```bash
pnpm install
```

3. 開発サーバーの起動

```bash
pnpm --filter web dev
```
