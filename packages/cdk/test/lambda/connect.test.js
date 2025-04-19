const { handler } = require('../../lambda/connect/index');

describe('connect Lambda function', () => {
  test('正常に接続が受け入れられる', async () => {
    // コンソールログのスパイを作成
    const consoleSpy = jest.spyOn(console, 'log');

    // テストデータ
    const event = {
      requestContext: {
        connectionId: 'test-connection-id-123',
        eventType: 'CONNECT',
        connectedAt: 1617990000000
      }
    };

    // Lambda関数を実行
    const result = await handler(event);

    // レスポンスを検証
    expect(result.statusCode).toBe(200);

    // コンソールログの呼び出しを検証
    expect(consoleSpy).toHaveBeenCalledWith('Connect requested for:', 'test-connection-id-123');

    // スパイをリストア
    consoleSpy.mockRestore();
  });

  test('接続IDなしでも正常に処理される', async () => {
    // コンソールログのスパイを作成
    const consoleSpy = jest.spyOn(console, 'log');

    // テストデータ（接続IDなし）
    const event = {
      requestContext: {
        eventType: 'CONNECT',
        connectedAt: 1617990000000
      }
    };

    // Lambda関数を実行
    const result = await handler(event);

    // レスポンスを検証
    expect(result.statusCode).toBe(200);

    // コンソールログの呼び出しを検証
    expect(consoleSpy).toHaveBeenCalledWith('Connect requested for:', undefined);

    // スパイをリストア
    consoleSpy.mockRestore();
  });
});