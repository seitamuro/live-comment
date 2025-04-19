const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// 環境変数から取得する必要あり。CDKデプロイ後に出力される値を使用する
// ローカル開発時はexport API_URL=https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/ のように設定する
const API_URL = process.env.API_URL;

// テストを実行する前に確認
beforeAll(() => {
  if (!API_URL) {
    throw new Error('API_URLが設定されていません。CDKデプロイ後の出力値を環境変数に設定してください。');
  }
});

describe('API Integration Tests', () => {
  // テストで使用する変数
  let roomId;
  let hostId;
  let commentId;

  // 各テスト前に実行
  beforeAll(() => {
    hostId = `test-host-${uuidv4()}`;
  });

  test('部屋を作成する', async () => {
    const response = await axios.post(`${API_URL}/rooms`, {
      name: 'Integration Test Room',
      hostId,
    });

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('roomId');
    expect(response.data).toHaveProperty('name', 'Integration Test Room');
    expect(response.data).toHaveProperty('hostId', hostId);
    expect(response.data).toHaveProperty('status', 'OPEN');
    
    // 後続のテストで使用するためroomIdを保存
    roomId = response.data.roomId;
  });

  test('コメントを投稿する', async () => {
    // 部屋IDが取得できていない場合はスキップ
    if (!roomId) {
      console.log('部屋IDが取得できていないため、テストをスキップします');
      return;
    }

    const response = await axios.post(`${API_URL}/rooms/${roomId}/comments`, {
      roomId,
      content: 'This is an integration test comment',
      nickname: 'Integration Tester',
    });

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('commentId');
    expect(response.data).toHaveProperty('roomId', roomId);
    expect(response.data).toHaveProperty('content', 'This is an integration test comment');
    expect(response.data).toHaveProperty('nickname', 'Integration Tester');
    
    // 後続のテストで使用するためcommentIdを保存
    commentId = response.data.commentId;
  });

  test('部屋のコメント一覧を取得する', async () => {
    // 部屋IDが取得できていない場合はスキップ
    if (!roomId) {
      console.log('部屋IDが取得できていないため、テストをスキップします');
      return;
    }

    const response = await axios.get(`${API_URL}/rooms/${roomId}/comments`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('roomId', roomId);
    expect(response.data).toHaveProperty('comments');
    expect(Array.isArray(response.data.comments)).toBe(true);
    
    // 少なくとも1つのコメントが存在することを確認
    expect(response.data.comments.length).toBeGreaterThan(0);
    
    // 投稿したコメントが含まれていることを確認
    if (commentId) {
      const comment = response.data.comments.find(c => c.commentId === commentId);
      expect(comment).toBeDefined();
      expect(comment.content).toBe('This is an integration test comment');
    }
  });

  test('ユーザーの部屋一覧を取得する', async () => {
    const response = await axios.get(`${API_URL}/rooms?hostId=${hostId}`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('rooms');
    expect(Array.isArray(response.data.rooms)).toBe(true);
    
    // 少なくとも1つの部屋が存在することを確認
    expect(response.data.rooms.length).toBeGreaterThan(0);
    
    // 作成した部屋が含まれていることを確認
    if (roomId) {
      const room = response.data.rooms.find(r => r.roomId === roomId);
      expect(room).toBeDefined();
      expect(room.name).toBe('Integration Test Room');
    }
  });

  test('部屋を閉じる', async () => {
    // 部屋IDが取得できていない場合はスキップ
    if (!roomId) {
      console.log('部屋IDが取得できていないため、テストをスキップします');
      return;
    }

    const response = await axios.patch(`${API_URL}/rooms/${roomId}`, {
      hostId,
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('roomId', roomId);
    expect(response.data).toHaveProperty('status', 'CLOSED');
  });
});