import { handler } from '../../lambda/disconnect/index';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';

// モックの設定
const ddbMock = mockClient(DynamoDBDocumentClient);

// テストの前に実行
beforeEach(() => {
  // モックをリセット
  ddbMock.reset();
  // 環境変数を設定
  process.env.CONNECTIONS_TABLE = 'test-connections-table';
});

describe('disconnect Lambda function', () => {
  test('正常に接続が削除される', async () => {
    // DynamoDBのDeleteCommandのモックを設定
    ddbMock.on(DeleteCommand).resolves({});

    // テストデータ
    const event = {
      requestContext: {
        connectionId: 'test-connection-id-123',
        eventType: 'DISCONNECT',
        disconnectedAt: 1617990000000
      }
    } as unknown as APIGatewayProxyWebsocketEventV2;

    // Lambda関数を実行
    const result = await handler(event);

    // レスポンスを検証
    expect(result.statusCode).toBe(200);

    // DynamoDBの削除パラメータを検証
    const deleteCalls = ddbMock.commandCalls(DeleteCommand);
    expect(deleteCalls.length).toBe(1);
    const deleteCall = deleteCalls[0];
    expect(deleteCall.args[0].input.TableName).toBe('test-connections-table');
    expect(deleteCall.args[0].input.Key.connectionId).toBe('test-connection-id-123');
  });

  test('DynamoDB例外が発生した場合はエラーを返す', async () => {
    // コンソールエラーのスパイを作成
    const consoleSpy = jest.spyOn(console, 'error');

    // DynamoDBのDeleteCommandが例外をスローするようにモックを設定
    ddbMock.on(DeleteCommand).rejects(new Error('DB Error'));

    // テストデータ
    const event = {
      requestContext: {
        connectionId: 'test-connection-id-123',
        eventType: 'DISCONNECT',
        disconnectedAt: 1617990000000
      }
    } as unknown as APIGatewayProxyWebsocketEventV2;

    // Lambda関数を実行
    const result = await handler(event);

    // エラーレスポンスを検証
    expect(result.statusCode).toBe(500);

    // コンソールエラーの呼び出しを検証
    expect(consoleSpy).toHaveBeenCalledWith('Error disconnecting:', expect.any(Error));

    // スパイをリストア
    consoleSpy.mockRestore();
  });
});