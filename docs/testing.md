# Live Comment API テストガイド

このドキュメントでは、Live Comment APIのテスト戦略と実行方法について説明します。

## 基本方針

- テストツールにはjestを利用
- テストコードはtypescriptで作成
- 生成AIで大量のコードを生成しているため、品質保証のためテストは可能な限り網羅的に作成する

## テスト戦略

Live Comment APIは以下の複数レベルでテストを行います：

1. **ユニットテスト**: 個別のLambda関数のロジックをテスト
2. **インフラテスト**: CDKが期待通りのリソースを生成するかテスト
3. **統合テスト**: デプロイ済みAPIの動作を実際にテスト
4. **パフォーマンステスト**: API負荷テスト（オプション）

## 1. ユニットテスト

Lambda関数のロジックを個別にテストします。AWSリソースはモック化して利用します。

### セットアップ

```bash
cd packages/cdk
npm install aws-sdk-client-mock @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb uuid
```

### テスト実行

```bash
npm run test:lambda
```

### ユニットテストの例

```javascript
// Lambda関数のテスト例
test('正常に部屋が作成される', async () => {
  // DynamoDBのPutCommandのモックを設定
  ddbMock.on(PutCommand).resolves({});

  const event = {
    body: JSON.stringify({
      name: 'テスト部屋',
      hostId: 'test-host-123',
    }),
  };

  const result = await handler(event);

  expect(result.statusCode).toBe(201);
  // 他の検証...
});
```

## 2. インフラテスト

CDKのスタック定義をテストして、期待通りのリソースが生成されるか確認します。

### テスト実行

```bash
npm test
```

### インフラテストの例

```typescript
test('DynamoDBテーブルが正しく作成される', () => {
  // 3つのDynamoDBテーブルが作成されること
  template.resourceCountIs('AWS::DynamoDB::Table', 3);

  // テーブルプロパティの検証
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    TableName: 'LiveComment-Rooms-test',
    // 他のプロパティ...
  });
});
```

## 3. 統合テスト

実際にデプロイされたAPIに対してリクエストを送信し、エンドツーエンドで動作を検証します。

### 前提条件

- AWS CDKでAPIがデプロイ済みであること
- API GatewayのエンドポイントURLが環境変数に設定されていること

### セットアップ

```bash
cd packages/cdk
npm install axios uuid
```

### テスト実行

```bash
# API URLを環境変数に設定
export API_URL=$(aws cloudformation describe-stacks --stack-name LiveCommentStack-dev --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)

# テスト実行
npm run test:integration
```

### 統合テストの例

```javascript
test('部屋を作成する', async () => {
  const response = await axios.post(`${API_URL}/rooms`, {
    name: 'Integration Test Room',
    hostId,
  });

  expect(response.status).toBe(201);
  expect(response.data).toHaveProperty('roomId');
  // 他の検証...
});
```

## 4. パフォーマンステスト（オプション）

API Gateway、Lambda、DynamoDBなどのサービスの応答時間やスケーリング能力をテストします。

### ツール

- [Artillery](https://artillery.io/)
- [Locust](https://locust.io/)

### セットアップ例（Artillery）

```bash
npm install -g artillery
```

### テスト実行例

```bash
# テスト定義ファイルを作成
cat > performance-test.yml << EOF
config:
  target: "https://your-api-gateway-url"
  phases:
    - duration: 60
      arrivalRate: 5
      rampTo: 20
      name: "Ramp up API load"
scenarios:
  - name: "Create rooms and post comments"
    flow:
      - post:
          url: "/rooms"
          json:
            name: "Load Test Room {{ $randomString(10) }}"
            hostId: "perf-test-{{ $randomNumber(1000, 9999) }}"
          capture:
            - json: "$.roomId"
              as: "roomId"
      - post:
          url: "/rooms/{{ roomId }}/comments"
          json:
            roomId: "{{ roomId }}"
            content: "Performance test comment {{ $randomString(20) }}"
            nickname: "PerfTester"
EOF

# テスト実行
artillery run performance-test.yml
```

## CI/CDパイプラインでのテスト自動化

GitHub Actionsなどを使用して、コミットやプルリクエスト時に自動的にテストを実行することができます。

### GitHub Actionsワークフロー例

```yaml
name: API Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd packages/cdk && npm ci
      - run: cd packages/cdk && npm test
      - run: cd packages/cdk && npm run test:lambda
```

## テストカバレッジの向上

テストカバレッジを向上させるためのヒント：

1. 新機能を追加する前にテストを書く（TDD）
2. エラーケースも含めてテストする
3. 境界値のテストを追加する
4. エッジケースや例外処理のテストを追加する

## テストの拡張

- WebSocketのテスト追加
- リアルタイム機能のテスト
- セキュリティテスト（APIキー、認証、認可）
- 障害復旧テスト

## トラブルシューティング

### テスト実行時のよくある問題

1. API URLが正しく設定されていない

   ```
   エラー: API_URLが設定されていません
   解決: export API_URL=https://your-api-url
   ```

2. 認証情報が不足している
   ```
   エラー: The security token included in the request is invalid
   解決: AWS認証情報が正しく設定されているか確認する
   ```
