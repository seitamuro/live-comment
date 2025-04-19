# Live Comment CDK Infrastructure

このパッケージはLive Commentアプリケーションのインフラストラクチャを定義します。

## アーキテクチャ

- **DynamoDB**: データ永続化（部屋情報、コメント情報）
- **API Gateway**: REST APIおよびWebSocket API
- **Lambda**: サーバーレス関数（TypeScriptで実装）
- **S3 + CloudFront**: フロントエンドホスティング

## 環境変数

CDKは以下の環境変数を使用します：

- `ENVIRONMENT`: デプロイ環境名（dev, test, prod）。未指定の場合は「dev」
- `CDK_DEFAULT_ACCOUNT`: デプロイ先AWSアカウントID
- `CDK_DEFAULT_REGION`: デプロイ先AWSリージョン（未指定の場合は「ap-northeast-1」）

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# TypeScriptコンパイル
npm run build
```

## デプロイ

開発環境へのデプロイ:

```bash
export ENVIRONMENT=dev
npm run cdk deploy
```

本番環境へのデプロイ:

```bash
export ENVIRONMENT=prod
npm run cdk deploy
```

## フロントエンドのデプロイ

フロントエンドのビルド結果をS3にアップロード:

```bash
# フロントエンドのビルド
cd ../web
npm run build

# S3バケットへのアップロード（スタック出力からバケット名を取得）
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name LiveCommentStack-dev --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)
aws s3 sync ./dist s3://$BUCKET_NAME/
```

## テスト

### ユニットテスト実行

```bash
# すべてのテストを実行
npm test

# Lambda関数のテストのみ実行
npm run test:lambda

# 統合テストのみ実行（デプロイ後）
export API_URL=$(aws cloudformation describe-stacks --stack-name LiveCommentStack-dev --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)
npm run test:integration
```
