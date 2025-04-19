const { handler } = require('../../lambda/post-comment/index');
const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

// モックの設定
const ddbMock = mockClient(DynamoDBDocumentClient);
const apigwMock = mockClient(ApiGatewayManagementApiClient);

// テストの前に実行
beforeEach(() => {
  // モックをリセット
  ddbMock.reset();
  apigwMock.reset();
  // 環境変数を設定
  process.env.COMMENTS_TABLE = 'test-comments-table';
  process.env.CONNECTIONS_TABLE = 'test-connections-table';
  process.env.WEBSOCKET_API_ENDPOINT = 'https://test-api.execute-api.ap-northeast-1.amazonaws.com/dev';
});

describe('post-comment Lambda function', () => {
  test('正常にコメントが投稿される', async () => {
    // DynamoDBのPutCommandのモックを設定
    ddbMock.on(PutCommand).resolves({});
    
    // WebSocketコネクションがない場合のクエリ結果
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });
    
    // テストデータ
    const event = {
      body: JSON.stringify({
        roomId: 'test-room-123',
        content: 'テストコメントです',
        nickname: 'テストユーザー',
      }),
    };
    
    // Lambda関数を実行
    const result = await handler(event);
    
    // レスポンスを検証
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.roomId).toBe('test-room-123');
    expect(body.content).toBe('テストコメントです');
    expect(body.nickname).toBe('テストユーザー');
    expect(body.commentId).toBeDefined();
    
    // DynamoDBへの書き込みを検証
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBe(1);
    const putCall = putCalls[0];
    expect(putCall.args[0].input.TableName).toBe('test-comments-table');
    expect(putCall.args[0].input.Item.roomId).toBe('test-room-123');
    expect(putCall.args[0].input.Item.content).toBe('テストコメントです');
  });
  
  test('WebSocketコネクションがある場合、コメントがブロードキャストされる', async () => {
    // DynamoDBのPutCommandのモックを設定
    ddbMock.on(PutCommand).resolves({});
    
    // WebSocketコネクションがある場合のクエリ結果
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { connectionId: 'connection-1' },
        { connectionId: 'connection-2' },
      ],
    });
    
    // WebSocket APIのモックを設定
    apigwMock.on(PostToConnectionCommand).resolves({});
    
    // テストデータ
    const event = {
      body: JSON.stringify({
        roomId: 'test-room-123',
        content: 'テストコメントです',
        nickname: 'テストユーザー',
      }),
    };
    
    // Lambda関数を実行
    const result = await handler(event);
    
    // レスポンスを検証
    expect(result.statusCode).toBe(201);
    
    // WebSocketへの送信を検証
    const postCalls = apigwMock.commandCalls(PostToConnectionCommand);
    expect(postCalls.length).toBe(2);
    expect(postCalls[0].args[0].input.ConnectionId).toBe('connection-1');
    expect(postCalls[1].args[0].input.ConnectionId).toBe('connection-2');
  });
  
  test('必須フィールドが欠けている場合はエラーを返す', async () => {
    // テストデータ（contentが欠けている）
    const event = {
      body: JSON.stringify({
        roomId: 'test-room-123',
        nickname: 'テストユーザー',
      }),
    };
    
    // Lambda関数を実行
    const result = await handler(event);
    
    // エラーレスポンスを検証
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('Missing required fields');
  });
});