const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    // Parse request body
    const requestBody = JSON.parse(event.body);
    const { roomId, content, nickname } = requestBody;
    
    if (!roomId || !content) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Missing required fields: roomId and content',
        }),
      };
    }
    
    // Generate unique comment ID
    const commentId = uuidv4();
    
    // Current timestamp
    const createdAt = new Date().toISOString();
    
    // Create comment item
    const commentItem = {
      roomId,
      commentId,
      content,
      nickname: nickname || 'Anonymous',
      createdAt,
    };
    
    // Save to DynamoDB
    await ddb.send(
      new PutCommand({
        TableName: process.env.COMMENTS_TABLE,
        Item: commentItem,
      })
    );
    
    // Publish the comment to connected WebSocket clients for this room
    if (process.env.WEBSOCKET_API_ENDPOINT && process.env.CONNECTIONS_TABLE) {
      try {
        // Create API Gateway Management API client
        const apigwManagementApi = new ApiGatewayManagementApiClient({
          endpoint: process.env.WEBSOCKET_API_ENDPOINT,
        });
        
        // Get all connections for this room
        const connections = await ddb.send(
          new QueryCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            IndexName: 'roomId-index',
            KeyConditionExpression: 'roomId = :roomId',
            ExpressionAttributeValues: {
              ':roomId': roomId,
            },
          })
        );
        
        // Send the comment to all connections
        const postCalls = connections.Items.map(async ({ connectionId }) => {
          try {
            await apigwManagementApi.send(
              new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: JSON.stringify(commentItem),
              })
            );
          } catch (e) {
            // Connection no longer exists or is stale, delete it
            if (e.statusCode === 410) {
              await ddb.send(
                new DeleteCommand({
                  TableName: process.env.CONNECTIONS_TABLE,
                  Key: { connectionId },
                })
              );
            }
          }
        });
        
        await Promise.all(postCalls);
      } catch (wsError) {
        console.error('Error sending to WebSocket:', wsError);
        // Continue even if sending to WebSocket fails
      }
    }
    
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(commentItem),
    };
  } catch (error) {
    console.error('Error posting comment:', error);
    
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