import { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

interface JoinRoomMessage {
  action: string;
  roomId: string;
}

export const handler = async (event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;
  const body = JSON.parse(event.body || '{}') as JoinRoomMessage;
  const { roomId } = body;
  
  if (!roomId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'roomId is required' }),
    };
  }
  
  try {
    // Check if the room exists
    const roomResponse = await ddb.send(new GetCommand({
      TableName: process.env.ROOMS_TABLE!,
      Key: { roomId },
    }));
    
    if (!roomResponse.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Room not found' }),
      };
    }
    
    // Store the connection with the roomId
    await ddb.send(new PutCommand({
      TableName: process.env.CONNECTIONS_TABLE!,
      Item: {
        connectionId,
        roomId,
        timestamp: new Date().toISOString(),
      },
    }));
    
    return { statusCode: 200 };
  } catch (err) {
    console.error('Error joining room:', err);
    return { statusCode: 500 };
  }
};