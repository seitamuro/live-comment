const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    // Get roomId from path parameters
    const { roomId } = event.pathParameters;
    const requestBody = JSON.parse(event.body);
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
        TableName: process.env.ROOMS_TABLE,
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
        TableName: process.env.ROOMS_TABLE,
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