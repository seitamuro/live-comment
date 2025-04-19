const { handler } = require('../../lambda/get-user-rooms/index');
const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// モックの設定
const ddbMock = mockClient(DynamoDBDocumentClient);

// テストの前に実行
beforeEach(() => {
  // モックをリセット
  ddbMock.reset();
  // 環境変数を設定
  process.env.ROOMS_TABLE = 'test-rooms-table';
});

describe('get-user-rooms Lambda function', () => {
  test('正常にユーザーの部屋リストが取得される', async () => {
    // テスト用の部屋データ
    const mockRooms = [
      {
        roomId: 'room-1',
        name: 'テスト部屋1',
        hostId: 'test-host-123',
        status: 'OPEN',
        createdAt: '2025-04-19T12:00:00Z'
      },
      {
        roomId: 'room-2',
        name: 'テスト部屋2',
        hostId: 'test-host-123',
        status: 'CLOSED',
        createdAt: '2025-04-19T13:00:00Z'
      }
    ];

    // DynamoDBのScanCommandのモックを設定
    ddbMock.on(ScanCommand).resolves({
      Items: mockRooms
    });

    // テストデータ
    const event = {
      queryStringParameters: {
        hostId: 'test-host-123'
      }
    };

    // Lambda関数を実行
    const result = await handler(event);

    // レスポンスを検証
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.rooms).toEqual(mockRooms);

    // DynamoDBのスキャンパラメータを検証
    const scanCalls = ddbMock.commandCalls(ScanCommand);
    expect(scanCalls.length).toBe(1);
    const scanCall = scanCalls[0];
    expect(scanCall.args[0].input.TableName).toBe('test-rooms-table');
    expect(scanCall.args[0].input.FilterExpression).toBe('hostId = :hostId');
    expect(scanCall.args[0].input.ExpressionAttributeValues[':hostId']).toBe('test-host-123');
  });

  test('hostIdが指定されていない場合はエラーを返す', async () => {
    // テストデータ（hostIdが指定されていない）
    const event = {
      queryStringParameters: {}
    };

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('Missing required parameter');
  });

  test('queryStringParametersがnullの場合はエラーを返す', async () => {
    // テストデータ（queryStringParametersがnull）
    const event = {
      queryStringParameters: null
    };

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('Missing required parameter');
  });

  test('ユーザーが部屋を持っていない場合は空リストを返す', async () => {
    // DynamoDBのScanCommandのモックを設定（空のリスト）
    ddbMock.on(ScanCommand).resolves({
      Items: []
    });

    // テストデータ
    const event = {
      queryStringParameters: {
        hostId: 'test-host-123'
      }
    };

    // Lambda関数を実行
    const result = await handler(event);

    // レスポンスを検証
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.rooms).toEqual([]);
  });

  test('DynamoDB例外が発生した場合はエラーを返す', async () => {
    // DynamoDBのScanCommandが例外をスローするようにモックを設定
    ddbMock.on(ScanCommand).rejects(new Error('DB Error'));

    // テストデータ
    const event = {
      queryStringParameters: {
        hostId: 'test-host-123'
      }
    };

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Internal server error');
  });
});