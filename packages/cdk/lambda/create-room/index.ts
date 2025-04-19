import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

interface CreateRoomRequest {
  name: string;
  hostId: string;
}

interface RoomItem {
  roomId: string;
  name: string;
  hostId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    const requestBody = JSON.parse(event.body || '{}') as CreateRoomRequest;
    const { name, hostId } = requestBody;

    if (!name || !hostId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Missing required fields: name and hostId',
        }),
      };
    }

    // Generate unique room ID
    const roomId = uuidv4();

    // Current timestamp
    const createdAt = new Date().toISOString();

    // Create room item
    const roomItem: RoomItem = {
      roomId,
      name,
      hostId,
      status: 'OPEN',
      createdAt,
      updatedAt: createdAt,
    };

    // Save to DynamoDB
    await ddb.send(
      new PutCommand({
        TableName: process.env.ROOMS_TABLE!,
        Item: roomItem,
      }),
    );

    // Return success response
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        roomId,
        name,
        hostId,
        status: 'OPEN',
        createdAt,
      }),
    };
  } catch (error) {
    console.error('Error creating room:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Internal server error',
      }),
    };
  }
};
