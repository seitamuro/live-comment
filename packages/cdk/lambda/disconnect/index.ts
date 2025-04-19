import { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;
  
  try {
    // Remove the connection from the connections table
    await ddb.send(new DeleteCommand({
      TableName: process.env.CONNECTIONS_TABLE!,
      Key: {
        connectionId,
      },
    }));
    
    return { statusCode: 200 };
  } catch (err) {
    console.error('Error disconnecting:', err);
    return { statusCode: 500 };
  }
};