import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

interface CloseRoomRequest {
  hostId: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Get roomId from path parameters
    const roomId = event.pathParameters?.roomId;
    const requestBody = JSON.parse(event.body || '{}') as CloseRoomRequest;
    const { hostId } = requestBody;
    
    if (!roomId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Missing required parameter: roomId',
        }),
      };
    }
    
    if (!hostId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Missing required parameter: hostId',
        }),
      };
    }
    
    // Get room to verify hostId
    const roomResponse = await ddb.send(
      new GetCommand({
        TableName: process.env.ROOMS_TABLE!,
        Key: {
          roomId,
        },
      })
    );
    
    if (!roomResponse.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Room not found',
        }),
      };
    }
    
    if (roomResponse.Item.hostId !== hostId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Forbidden: Only the host can close the room',
        }),
      };
    }
    
    // Update room status to CLOSED
    const updatedAt = new Date().toISOString();
    await ddb.send(
      new UpdateCommand({
        TableName: process.env.ROOMS_TABLE!,
        Key: {
          roomId,
        },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'CLOSED',
          ':updatedAt': updatedAt,
        },
        ReturnValues: 'ALL_NEW',
      })
    );
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        roomId,
        status: 'CLOSED',
        updatedAt,
      }),
    };
  } catch (error) {
    console.error('Error closing room:', error);
    
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