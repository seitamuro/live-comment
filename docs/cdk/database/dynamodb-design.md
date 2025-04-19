# DynamoDB テーブル設計

Live Commentアプリケーションは、以下の3つのDynamoDBテーブルを使用してデータを管理しています。

## 1. Roomsテーブル

ルーム（部屋）の情報を管理するテーブル。発表者が作成し、参加者がコメントを投稿する対象となる「部屋」の情報を保持します。

### テーブル名

`LiveComment-Rooms-${environmentName}`

### キー構造

- **PK**: roomId
  - 型: STRING
  - 役割: ルームを一意に識別するID。UUIDv4形式で生成される。

### 属性

| 属性名 | 型 | 必須 | 説明 |
|--------|----|----|------|
| roomId | STRING | ✅ | ルームを一意に識別するID（パーティションキー） |
| name | STRING | ✅ | ルームの名前 |
| hostId | STRING | ✅ | ルームを作成したホストのID |
| status | STRING | ✅ | ルームの状態。`OPEN`（開催中）または`CLOSED`（終了）のいずれかの値を取る |
| createdAt | STRING | ✅ | ルームの作成日時（ISO 8601形式） |
| updatedAt | STRING | ✅ | ルームの最終更新日時（ISO 8601形式） |

### アクセスパターン

- roomIdによるルームの取得（直接キー参照）
- hostIdによるユーザーのルーム一覧取得（Scan + Filter、本来はGSIが推奨）

### 注意事項

- 現在の実装では、hostIdに対するクエリを行う際にScanオペレーションを使用していますが、大規模な環境では次のようなGSIの追加が推奨されます：
  ```
  GSI: hostId-index
  PK: hostId
  SK: createdAt
  ```

---

## 2. Commentsテーブル

ルームに投稿されたコメントを管理するテーブル。

### テーブル名

`LiveComment-Comments-${environmentName}`

### キー構造

- **PK**: roomId
  - 型: STRING
  - 役割: コメントが投稿されたルームのID。Roomsテーブルの`roomId`と対応。
- **SK**: commentId
  - 型: STRING
  - 役割: コメントを一意に識別するID。UUIDv4形式で生成される。

### 属性

| 属性名 | 型 | 必須 | 説明 |
|--------|----|----|------|
| roomId | STRING | ✅ | コメントが投稿されたルームのID（パーティションキー） |
| commentId | STRING | ✅ | コメントを一意に識別するID（ソートキー） |
| content | STRING | ✅ | コメントの内容 |
| nickname | STRING | ✅ | コメント投稿者のニックネーム。未指定時は`Anonymous` |
| createdAt | STRING | ✅ | コメントの投稿日時（ISO 8601形式） |

### アクセスパターン

- 特定のルームに投稿された全コメントの取得（Query by roomId）
- コメントの作成と保存（PutItem）

### データの時間順序

ソートキー（commentId）はUUIDを使用しているため自然な時系列順になりませんが、`createdAt`属性を使用して時間順でのソートが可能です。

---

## 3. Connectionsテーブル

WebSocket接続情報を管理するテーブル。リアルタイムにコメントを配信するためのWebSocket接続を追跡します。

### テーブル名

`LiveComment-Connections-${environmentName}`

### キー構造

- **PK**: connectionId
  - 型: STRING
  - 役割: WebSocket接続を一意に識別するID。API Gateway WebSocketによって生成される。

### 属性

| 属性名 | 型 | 必須 | 説明 |
|--------|----|----|------|
| connectionId | STRING | ✅ | WebSocket接続を一意に識別するID（パーティションキー） |
| roomId | STRING | ✅ | 接続しているルームのID |
| timestamp | STRING | ✅ | 接続が確立された日時（ISO 8601形式） |

### グローバルセカンダリインデックス（GSI）

- **GSI**: roomId-index
  - **PK**: roomId
    - 型: STRING
    - 役割: 特定のルームに接続しているWebSocket接続を検索するためのインデックス

### アクセスパターン

- connectionIdによる接続情報の取得（直接キー参照）
- roomIdによるルームに接続している全WebSocket接続の取得（GSI Query by roomId）
- 接続の削除（接続解除時、DeleteItem by connectionId）

### 利用シナリオ

- WebSocketクライアントが`joinRoom`アクションを実行すると、接続情報がこのテーブルに保存される
- 新しいコメントが投稿されると、特定のルームに接続している全クライアントにデータが配信される
- クライアントが接続を解除すると、対応するレコードがテーブルから削除される

---

## データアクセス権限

各Lambda関数とテーブルのアクセス権限は以下のように設定されています：

| Lambda関数 | テーブル | アクセス権限 |
|-----------|----------|-------------|
| CreateRoomFunction | RoomsTable | 読み書き |
| PostCommentFunction | CommentsTable | 読み書き |
| PostCommentFunction | ConnectionsTable | 読み取り |
| GetRoomCommentsFunction | CommentsTable | 読み取り |
| CloseRoomFunction | RoomsTable | 読み書き |
| GetUserRoomsFunction | RoomsTable | 読み取り |
| DisconnectFunction | ConnectionsTable | 読み書き |
| JoinRoomFunction | ConnectionsTable | 読み書き |
| JoinRoomFunction | RoomsTable | 読み取り |

## 環境分離

テーブル名には環境名（${environmentName}）が含まれており、開発環境と本番環境のデータを分離しています。これにより、本番データに影響を与えずに開発環境でのテストが可能です。

## 削除ポリシー

テーブルの削除ポリシーは環境によって異なります：

- 開発環境（dev）: `DESTROY` - スタック削除時にテーブルも削除
- 本番環境（prod）: `RETAIN` - スタック削除時もテーブルを保持