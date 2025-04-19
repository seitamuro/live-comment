const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    // Parse request body
    const requestBody = JSON.parse(event.body);
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
    const roomItem = {
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
        TableName: process.env.ROOMS_TABLE,
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
