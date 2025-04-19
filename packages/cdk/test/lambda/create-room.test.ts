import { handler } from '../../lambda/create-room/index';
const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');


// モックの設定
const ddbMock = mockClient(DynamoDBDocumentClient);

// テストの前に実行
beforeEach(() => {
  // モックをリセット
  ddbMock.reset();
  // 環境変数を設定
  process.env.ROOMS_TABLE = 'test-rooms-table';
});

describe('create-room Lambda function', () => {
  test('正常に部屋が作成される', async () => {
    // DynamoDBのPutCommandのモックを設定
    ddbMock.on(PutCommand).resolves({});

    // テストデータ
    const event = {
      body: JSON.stringify({
        name: 'テスト部屋',
        hostId: 'test-host-123',
      }),
    };

    // Lambda関数を実行
    const result = await handler(event as any);

    // レスポンスを検証
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.name).toBe('テスト部屋');
    expect(body.hostId).toBe('test-host-123');
    expect(body.roomId).toBeDefined();
    expect(body.status).toBe('OPEN');

    // DynamoDBへの書き込みを検証
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBe(1);
    const putCall = putCalls[0];
    expect(putCall.args[0].input.TableName).toBe('test-rooms-table');
    expect(putCall.args[0].input.Item.name).toBe('テスト部屋');
    expect(putCall.args[0].input.Item.hostId).toBe('test-host-123');
  });

  test('必須フィールドが欠けている場合はエラーを返す', async () => {
    // テストデータ（nameが欠けている）
    const event = {
      body: JSON.stringify({
        hostId: 'test-host-123',
      }),
    };

    // Lambda関数を実行
    const result = await handler(event as any);

    // エラーレスポンスを検証
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('Missing required fields');
  });

  test('DynamoDB例外が発生した場合はエラーを返す', async () => {
    // DynamoDBのPutCommandが例外をスローするようにモックを設定
    ddbMock.on(PutCommand).rejects(new Error('DB Error'));

    // テストデータ
    const event = {
      body: JSON.stringify({
        name: 'テスト部屋',
        hostId: 'test-host-123',
      }),
    };

    // Lambda関数を実行
    const result = await handler(event as any);

    // エラーレスポンスを検証
    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Internal server error');
  });
});
