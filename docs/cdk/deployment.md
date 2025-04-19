# Live Comment デプロイガイド

このドキュメントでは、Live Commentアプリケーションをデプロイする手順を説明します。

## 前提条件

- AWS CLIがインストールされ、設定されていること
- 適切なAWS認証情報が設定されていること
- Node.js 20.x以上がインストールされていること
- pnpmがグローバルにインストールされていること

## 環境変数の設定

デプロイ環境を制御するための環境変数：

```bash
# デプロイ環境の設定（dev、test、prodのいずれか）
export ENVIRONMENT=dev

# AWSリージョンの設定（オプション、デフォルトはap-northeast-1）
export AWS_REGION=ap-northeast-1
```

## インフラストラクチャのデプロイ

### 1. リポジトリのクローン

```bash
git clone https://github.com/seitamuro/live-comment.git
cd live-comment
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. CDKのデプロイ

```bash
cd packages/cdk

# CDKブートストラップ（初回のみ）
pnpm cdk bootstrap

# スタックのデプロイ
pnpm cdk deploy
```

デプロイが完了すると、以下のような出力が表示されます：

```
✅ LiveCommentStack-dev

Outputs:
LiveCommentStack-dev.ApiUrl = https://xxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/
LiveCommentStack-dev.WebsiteUrl = https://xxxxxxxxx.cloudfront.net
LiveCommentStack-dev.WebSocketURL = wss://xxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/dev
```

## フロントエンドのデプロイ

### 1. フロントエンドのビルド

```bash
cd packages/web
pnpm build
```

### 2. S3バケットへのアップロード

```bash
# CloudFormation出力からS3バケット名を取得
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name LiveCommentStack-${ENVIRONMENT} --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)

# ビルド成果物をS3にアップロード
aws s3 sync ./dist s3://${BUCKET_NAME}/
```

## 複数環境へのデプロイ

### 開発環境（dev）

```bash
export ENVIRONMENT=dev
pnpm cdk deploy
```

### テスト環境（test）

```bash
export ENVIRONMENT=test
pnpm cdk deploy
```

### 本番環境（prod）

```bash
export ENVIRONMENT=prod
pnpm cdk deploy
```

## 環境の破棄

環境を破棄する場合は以下のコマンドを実行します：

```bash
export ENVIRONMENT=dev
pnpm cdk destroy
```

## CI/CDパイプライン

GitHub Actionsを使用したCI/CDパイプラインが設定されています。
プルリクエストがマージされると自動的にデプロイされます。

`.github/workflows/deploy.yml` で設定を確認できます。

## トラブルシューティング

### デプロイエラー

1. **認証エラー**

   ```
   エラー: User is not authorized to perform: cloudformation:CreateStack
   ```

   解決: AWS認証情報が適切に設定されているか確認します。

2. **名前競合エラー**

   ```
   エラー: Stack LiveCommentStack-dev already exists
   ```

   解決: 既存のスタックを更新する場合は `cdk deploy` のみ使用するか、先に破棄します。

3. **リソース作成失敗**

   ```
   エラー: The following resource(s) failed to create: [BucketName]
   ```

   解決: CloudFormationコンソールでエラーの詳細を確認するか、バケット名が既に使用されていないか確認します。

### ランタイムエラー

Lambdaのエラーログを確認するには：

```bash
# ログストリームの表示
aws logs describe-log-groups --log-group-name-prefix '/aws/lambda/LiveCommentStack'

# 特定の関数のログを表示
LOG_GROUP="/aws/lambda/LiveCommentStack-${ENVIRONMENT}-CreateRoomFunction-XXXX"
aws logs get-log-events --log-group-name "$LOG_GROUP" --log-stream-name 'YYYY'
```