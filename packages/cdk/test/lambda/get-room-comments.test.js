const { handler } = require('../../lambda/get-room-comments/index');
const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// モックの設定
const ddbMock = mockClient(DynamoDBDocumentClient);

// テストの前に実行
beforeEach(() => {
  // モックをリセット
  ddbMock.reset();
  // 環境変数を設定
  process.env.COMMENTS_TABLE = 'test-comments-table';
});

describe('get-room-comments Lambda function', () => {
  test('正常にコメントリストが取得される', async () => {
    // テスト用のコメントデータ
    const mockComments = [
      {
        roomId: 'test-room-123',
        commentId: 'comment-1',
        content: 'テストコメント1',
        nickname: 'ユーザー1',
        createdAt: '2025-04-19T12:00:00Z'
      },
      {
        roomId: 'test-room-123',
        commentId: 'comment-2',
        content: 'テストコメント2',
        nickname: 'ユーザー2',
        createdAt: '2025-04-19T12:01:00Z'
      }
    ];

    // DynamoDBのQueryCommandのモックを設定
    ddbMock.on(QueryCommand).resolves({
      Items: mockComments
    });

    // テストデータ
    const event = {
      pathParameters: {
        roomId: 'test-room-123'
      }
    };

    // Lambda関数を実行
    const result = await handler(event);

    // レスポンスを検証
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.roomId).toBe('test-room-123');
    expect(body.comments).toEqual(mockComments);

    // DynamoDBのクエリパラメータを検証
    const queryCalls = ddbMock.commandCalls(QueryCommand);
    expect(queryCalls.length).toBe(1);
    const queryCall = queryCalls[0];
    expect(queryCall.args[0].input.TableName).toBe('test-comments-table');
    expect(queryCall.args[0].input.KeyConditionExpression).toBe('roomId = :roomId');
    expect(queryCall.args[0].input.ExpressionAttributeValues[':roomId']).toBe('test-room-123');
  });

  test('roomIdが指定されていない場合はエラーを返す', async () => {
    // テストデータ（roomIdが指定されていない）
    const event = {
      pathParameters: {}
    };

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('Missing required parameter');
  });

  test('DynamoDB例外が発生した場合はエラーを返す', async () => {
    // DynamoDBのQueryCommandが例外をスローするようにモックを設定
    ddbMock.on(QueryCommand).rejects(new Error('DB Error'));

    // テストデータ
    const event = {
      pathParameters: {
        roomId: 'test-room-123'
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