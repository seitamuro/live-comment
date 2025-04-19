const { handler } = require('../../lambda/close-room/index');
const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// モックの設定
const ddbMock = mockClient(DynamoDBDocumentClient);

// テストの前に実行
beforeEach(() => {
  // モックをリセット
  ddbMock.reset();
  // 環境変数を設定
  process.env.ROOMS_TABLE = 'test-rooms-table';
});

describe('close-room Lambda function', () => {
  test('正常に部屋が閉じられる', async () => {
    // 部屋の情報を取得するGetCommandのモックを設定
    ddbMock.on(GetCommand).resolves({
      Item: {
        roomId: 'test-room-123',
        name: 'テスト部屋',
        hostId: 'test-host-123',
        status: 'OPEN',
        createdAt: '2025-04-19T12:00:00Z'
      }
    });

    // 部屋のステータスを更新するUpdateCommandのモックを設定
    ddbMock.on(UpdateCommand).resolves({});

    // テストデータ
    const event = {
      pathParameters: {
        roomId: 'test-room-123'
      },
      body: JSON.stringify({
        hostId: 'test-host-123'
      })
    };

    // Lambda関数を実行
    const result = await handler(event);

    // レスポンスを検証
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.roomId).toBe('test-room-123');
    expect(body.status).toBe('CLOSED');
    expect(body.updatedAt).toBeDefined();

    // GetCommandの呼び出しを検証
    const getCalls = ddbMock.commandCalls(GetCommand);
    expect(getCalls.length).toBe(1);
    expect(getCalls[0].args[0].input.TableName).toBe('test-rooms-table');
    expect(getCalls[0].args[0].input.Key.roomId).toBe('test-room-123');

    // UpdateCommandの呼び出しを検証
    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0].args[0].input.TableName).toBe('test-rooms-table');
    expect(updateCalls[0].args[0].input.Key.roomId).toBe('test-room-123');
    expect(updateCalls[0].args[0].input.UpdateExpression).toBe('SET #status = :status, updatedAt = :updatedAt');
    expect(updateCalls[0].args[0].input.ExpressionAttributeValues[':status']).toBe('CLOSED');
  });

  test('存在しない部屋を閉じようとするとエラーになる', async () => {
    // 部屋が存在しないケース
    ddbMock.on(GetCommand).resolves({
      Item: null
    });

    // テストデータ
    const event = {
      pathParameters: {
        roomId: 'non-existent-room'
      },
      body: JSON.stringify({
        hostId: 'test-host-123'
      })
    };

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('Room not found');
  });

  test('別のホストが部屋を閉じようとするとエラーになる', async () => {
    // 別のホストIDの部屋が存在するケース
    ddbMock.on(GetCommand).resolves({
      Item: {
        roomId: 'test-room-123',
        name: 'テスト部屋',
        hostId: 'different-host-123', // リクエストとは異なるホストID
        status: 'OPEN',
        createdAt: '2025-04-19T12:00:00Z'
      }
    });

    // テストデータ
    const event = {
      pathParameters: {
        roomId: 'test-room-123'
      },
      body: JSON.stringify({
        hostId: 'test-host-123' // 部屋のホストとは異なるID
      })
    };

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('Forbidden');
  });

  test('roomIdが指定されていない場合はエラーを返す', async () => {
    // テストデータ（roomIdが指定されていない）
    const event = {
      pathParameters: {},
      body: JSON.stringify({
        hostId: 'test-host-123'
      })
    };

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('Missing required parameter: roomId');
  });

  test('hostIdが指定されていない場合はエラーを返す', async () => {
    // テストデータ（hostIdが指定されていない）
    const event = {
      pathParameters: {
        roomId: 'test-room-123'
      },
      body: JSON.stringify({})
    };

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('Missing required parameter: hostId');
  });

  test('DynamoDB例外が発生した場合はエラーを返す', async () => {
    // DynamoDBのGetCommandが例外をスローするようにモックを設定
    ddbMock.on(GetCommand).rejects(new Error('DB Error'));

    // テストデータ
    const event = {
      pathParameters: {
        roomId: 'test-room-123'
      },
      body: JSON.stringify({
        hostId: 'test-host-123'
      })
    };

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Internal server error');
  });
});