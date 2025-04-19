# Live Comment データベース設計

このディレクトリには、Live Commentアプリケーションで使用されるデータベースの設計ドキュメントが含まれています。

## 目次

- [DynamoDBテーブル設計](./dynamodb-design.md) - DynamoDBテーブルの詳細設計

## 概要

Live Commentアプリケーションでは、以下の3つのDynamoDBテーブルを使用してデータを管理しています：

1. **RoomsTable** - ルーム（部屋）情報の管理
2. **CommentsTable** - コメント情報の管理
3. **ConnectionsTable** - WebSocket接続情報の管理

## テーブル関連図

テーブル間の関係は以下のようになっています：

- `RoomsTable`の`roomId` ⟷ `CommentsTable`の`roomId` (1:N関係)
- `RoomsTable`の`roomId` ⟷ `ConnectionsTable`の`roomId` (1:N関係)

## データアクセスパターン

主要なデータアクセスパターンは以下の通りです：

1. ホストがルームを作成する (`RoomsTable`に新しいレコードを作成)
2. ユーザーがルームに参加する (`ConnectionsTable`に新しい接続情報を保存)
3. ユーザーがコメントを投稿する (`CommentsTable`に新しいコメントを保存)
4. ホストがルームの全コメントを閲覧する (`CommentsTable`からルームIDに基づいてクエリ)
5. ホストが自分の全ルームを閲覧する (`RoomsTable`から特定のホストIDでフィルタリング)
6. リアルタイム通知を送信する (`ConnectionsTable`からルームIDに基づいて接続を検索)

## 詳細設計

各テーブルの詳細設計については、[DynamoDBテーブル設計](./dynamodb-design.md)を参照してください。

## 設計上の考慮事項

- **パフォーマンス**：頻繁にアクセスするパターンに対しては、GSIを使用して効率的なクエリを実現
- **スケーラビリティ**：使用量に応じて自動的にスケールするPay-per-requestモードを採用
- **環境分離**：開発環境と本番環境でテーブル名を分けて独立した運用を実現
- **データ保持**：本番環境ではスタック削除時もデータを保持するポリシーを採用