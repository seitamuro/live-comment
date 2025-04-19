import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Get hostId from query parameters
    const hostId = event.queryStringParameters?.hostId;
    
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
    
    // In a production environment, we would use a GSI (Global Secondary Index) for hostId
    // For simplicity in this example, we'll use a scan operation with a filter
    const response = await ddb.send(
      new ScanCommand({
        TableName: process.env.ROOMS_TABLE!,
        FilterExpression: 'hostId = :hostId',
        ExpressionAttributeValues: {
          ':hostId': hostId,
        },
      })
    );
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        rooms: response.Items,
      }),
    };
  } catch (error) {
    console.error('Error getting user rooms:', error);
    
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