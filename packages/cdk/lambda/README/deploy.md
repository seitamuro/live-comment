# Live Comment CDKデプロイ手順

このドキュメントでは、AWS CDKを使用してLive Commentアプリケーションのインフラをデプロイする手順を説明します。

## 前提条件

- AWS CLIがインストールされていること
- AWS認証情報が設定されていること
- Node.js 20.x以上がインストールされていること
- pnpmがグローバルにインストールされていること

## 準備

1. 必要なパッケージをインストールします:

```bash
cd packages/cdk
pnpm install
```

2. AWS SDK依存関係をLambda関数に追加します:

```bash
cd lambda/create-room
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb uuid

cd ../post-comment
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-apigatewaymanagementapi uuid

cd ../get-room-comments
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb

cd ../close-room
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb

cd ../get-user-rooms
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## デプロイ

### 開発環境へのデプロイ

```bash
cd packages/cdk
pnpm cdk bootstrap # 初回のみ実行
pnpm cdk deploy LiveCommentStack-dev --context environment=dev
```

### 本番環境へのデプロイ

```bash
cd packages/cdk
pnpm cdk bootstrap # 初回のみ実行
pnpm cdk deploy LiveCommentStack-prod --context environment=prod
```

## スタックの削除

開発環境のスタックを削除する場合は以下のコマンドを実行します：

```bash
cd packages/cdk
pnpm cdk destroy LiveCommentStack-dev --context environment=dev
```

## 環境変数の取得

デプロイ後に出力される環境変数を確認します：

```bash
cd packages/cdk
pnpm cdk list-outputs LiveCommentStack-dev
```

主な出力項目：
- `ApiUrl`: REST APIのエンドポイント
- `WebSocketURL`: WebSocket APIのエンドポイント
- `WebsiteUrl`: フロントエンドのURL

## トラブルシューティング

### デプロイが失敗する場合

1. AWS認証情報が正しいか確認
2. アクセス権限が適切か確認
3. リソース名の競合がないか確認

### Lambda関数のエラー

CloudWatchログを確認することでエラーの詳細を確認できます。

```bash
aws logs describe-log-groups --log-group-name-prefix '/aws/lambda/LiveCommentStack'
aws logs get-log-events --log-group-name '/aws/lambda/LiveCommentStack-dev-CreateRoomFunction-XXXX' --log-stream-name 'YYYY'
```