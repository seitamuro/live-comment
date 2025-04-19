# Live Comment インフラストラクチャ設計

このドキュメントでは、Live Commentアプリケーションのインフラストラクチャアーキテクチャについて説明します。

## 全体アーキテクチャ

Live Commentは以下のAWSサービスを組み合わせて構築されています：

![アーキテクチャ図](../assets/architecture-diagram.png)

## コンポーネント詳細

### データストア

#### DynamoDB テーブル

| テーブル名 | 用途 | パーティションキー | ソートキー |
|------------|------|-------------------|----------|
| LiveComment-Rooms-{env} | 部屋情報の保存 | roomId | - |
| LiveComment-Comments-{env} | コメント情報の保存 | roomId | commentId |
| LiveComment-Connections-{env} | WebSocket接続情報 | connectionId | - |

### バックエンドサービス

#### Lambda 関数

| 関数名 | 用途 | API エンドポイント |
|--------|------|-------------------|
| CreateRoomFunction | 部屋の作成 | POST /rooms |
| GetUserRoomsFunction | ユーザーの部屋一覧取得 | GET /rooms?hostId={hostId} |
| CloseRoomFunction | 部屋のクローズ | PATCH /rooms/{roomId} |
| PostCommentFunction | コメントの投稿 | POST /rooms/{roomId}/comments |
| GetRoomCommentsFunction | 部屋のコメント一覧取得 | GET /rooms/{roomId}/comments |

#### API Gateway

- **REST API**: 通常のHTTPリクエスト処理用
- **WebSocket API**: リアルタイムメッセージ処理用
  - `$connect`: 接続時イベント
  - `$disconnect`: 切断時イベント
  - `joinRoom`: 部屋参加時イベント

### フロントエンド配信

- **S3**: 静的アセットのストレージ
- **CloudFront**: コンテンツ配信とキャッシュ

## セキュリティ

- APIアクセスはCORSで制限
- WebSocket接続は認証を実施（将来実装予定）

## スケーリング

- Lambda: オートスケール
- DynamoDB: PAY_PER_REQUEST（オンデマンド）モード

## 環境分離

- `ENVIRONMENT` 環境変数で環境を分離
- 開発環境（dev）と本番環境（prod）で別々のリソースセットを使用

## 監視とログ

- CloudWatch Logsでログを収集
- Lambdaメトリクスで関数のパフォーマンスを監視

## 災害復旧

- DynamoDBテーブルはリージョン内で高可用性を確保
- 重要データは本番環境でのみ削除保護を有効化

## 将来的な拡張

1. **認証機能**: Amazon Cognitoとの連携
2. **分析機能**: コメント分析のためのKinesisとAmazon Comprehendの統合
3. **マルチリージョンデプロイ**: グローバルレプリケーションの設定