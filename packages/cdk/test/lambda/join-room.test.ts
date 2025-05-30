import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../../lambda/join-room/index';

// モックの設定
const ddbMock = mockClient(DynamoDBDocumentClient);

// テストの前に実行
beforeEach(() => {
  // モックをリセット
  ddbMock.reset();
  // 環境変数を設定
  process.env.ROOMS_TABLE = 'test-rooms-table';
  process.env.CONNECTIONS_TABLE = 'test-connections-table';
});

describe('join-room Lambda function', () => {
  test('正常に部屋に参加できる', async () => {
    // 部屋の情報を取得するGetCommandのモックを設定
    ddbMock.on(GetCommand).resolves({
      Item: {
        roomId: 'test-room-123',
        name: 'テスト部屋',
        hostId: 'test-host-123',
        status: 'OPEN',
      },
    });

    // 接続情報を保存するPutCommandのモックを設定
    ddbMock.on(PutCommand).resolves({});

    // テストデータ
    const event = {
      requestContext: {
        connectionId: 'test-connection-id-123',
        eventType: 'MESSAGE',
        messageId: 'test-message-id-123',
      },
      body: JSON.stringify({
        action: 'joinRoom',
        roomId: 'test-room-123',
      }),
    } as unknown as APIGatewayProxyWebsocketEventV2;

    // Lambda関数を実行
    const result = await handler(event);

    // レスポンスを検証
    expect((result as any).statusCode).toBe(200);

    // GetCommandの呼び出しを検証
    const getCalls = ddbMock.commandCalls(GetCommand);
    expect(getCalls.length).toBe(1);
    expect(getCalls[0].args[0].input.TableName).toBe('test-rooms-table');
    expect(getCalls[0]?.args[0]?.input?.Key?.roomId).toBe('test-room-123');

    // PutCommandの呼び出しを検証
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBe(1);
    expect(putCalls[0].args[0].input.TableName).toBe('test-connections-table');
    expect(putCalls[0]?.args[0]?.input?.Item?.connectionId).toBe('test-connection-id-123');
    expect(putCalls[0]?.args[0]?.input?.Item?.roomId).toBe('test-room-123');
    expect(putCalls[0]?.args[0]?.input?.Item?.timestamp).toBeDefined();
  });

  test('存在しない部屋に参加しようとするとエラーになる', async () => {
    // 部屋が存在しないケース
    ddbMock.on(GetCommand).resolves({
      Item: undefined,
    });

    // テストデータ
    const event = {
      requestContext: {
        connectionId: 'test-connection-id-123',
        eventType: 'MESSAGE',
        messageId: 'test-message-id-123',
      },
      body: JSON.stringify({
        action: 'joinRoom',
        roomId: 'non-existent-room',
      }),
    } as unknown as APIGatewayProxyWebsocketEventV2;

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect((result as any).statusCode).toBe(404);
    const body = JSON.parse((result as any).body);
    expect(body.message).toContain('Room not found');
  });

  test('roomIdが指定されていない場合はエラーを返す', async () => {
    // テストデータ（roomIdが指定されていない）
    const event = {
      requestContext: {
        connectionId: 'test-connection-id-123',
        eventType: 'MESSAGE',
        messageId: 'test-message-id-123',
      },
      body: JSON.stringify({
        action: 'joinRoom',
      }),
    } as unknown as APIGatewayProxyWebsocketEventV2;

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect((result as any).statusCode).toBe(400);
    const body = JSON.parse((result as any).body);
    expect(body.message).toContain('roomId is required');
  });

  test('DynamoDB例外が発生した場合はエラーを返す', async () => {
    // コンソールエラーのスパイを作成
    const consoleSpy = jest.spyOn(console, 'error');

    // DynamoDBのGetCommandが例外をスローするようにモックを設定
    ddbMock.on(GetCommand).rejects(new Error('DB Error'));

    // テストデータ
    const event = {
      requestContext: {
        connectionId: 'test-connection-id-123',
        eventType: 'MESSAGE',
        messageId: 'test-message-id-123',
      },
      body: JSON.stringify({
        action: 'joinRoom',
        roomId: 'test-room-123',
      }),
    } as unknown as APIGatewayProxyWebsocketEventV2;

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect((result as any).statusCode).toBe(500);

    // コンソールエラーの呼び出しを検証
    expect(consoleSpy).toHaveBeenCalledWith('Error joining room:', expect.any(Error));

    // スパイをリストア
    consoleSpy.mockRestore();
  });
});
