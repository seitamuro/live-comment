import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface WebSocketApiProps {
  environmentName: string;
  commentsTable: dynamodb.Table;
  connectionsTableName: string;
}

export class WebSocketApi extends Construct {
  public readonly webSocketApi: apigatewayv2.CfnApi;
  public readonly webSocketStage: apigatewayv2.CfnStage;
  public readonly connectionsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: WebSocketApiProps) {
    super(scope, id);
    
    const { environmentName, commentsTable, connectionsTableName } = props;
    
    // DynamoDB Table to store WebSocket connections
    this.connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: connectionsTableName,
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environmentName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });
    
    // Add GSI for roomId to quickly find all connections for a room
    this.connectionsTable.addGlobalSecondaryIndex({
      indexName: 'roomId-index',
      partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
    });
    
    // Lambda Functions for WebSocket API
    const connectFn = new lambda.Function(this, 'ConnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Connect requested for:', event.requestContext.connectionId);
          return { statusCode: 200 };
        };
      `),
    });
    
    const disconnectFn = new lambda.Function(this, 'DisconnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
        
        const client = new DynamoDBClient({});
        const ddb = DynamoDBDocumentClient.from(client);
        
        exports.handler = async (event) => {
          const connectionId = event.requestContext.connectionId;
          
          try {
            // Remove the connection from the connections table
            await ddb.send(new DeleteCommand({
              TableName: process.env.CONNECTIONS_TABLE,
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
      `),
      environment: {
        CONNECTIONS_TABLE: this.connectionsTable.tableName,
      },
    });
    
    const joinRoomFn = new lambda.Function(this, 'JoinRoomFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
        
        const client = new DynamoDBClient({});
        const ddb = DynamoDBDocumentClient.from(client);
        
        exports.handler = async (event) => {
          const connectionId = event.requestContext.connectionId;
          const body = JSON.parse(event.body);
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
              TableName: process.env.ROOMS_TABLE,
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
              TableName: process.env.CONNECTIONS_TABLE,
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
      `),
      environment: {
        CONNECTIONS_TABLE: this.connectionsTable.tableName,
        ROOMS_TABLE: commentsTable.tableName.replace('Comments', 'Rooms'),
      },
    });
    
    // Grant permissions
    this.connectionsTable.grantReadWriteData(disconnectFn);
    this.connectionsTable.grantReadWriteData(joinRoomFn);
    
    // WebSocket API
    this.webSocketApi = new apigatewayv2.CfnApi(this, 'WebSocketApi', {
      name: `live-comment-websocket-${environmentName}`,
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action',
    });
    
    // Integrations
    const connectIntegration = new apigatewayv2.CfnIntegration(this, 'ConnectIntegration', {
      apiId: this.webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${cdk.Stack.of(this).region}:lambda:path/2015-03-31/functions/${connectFn.functionArn}/invocations`,
    });
    
    const disconnectIntegration = new apigatewayv2.CfnIntegration(this, 'DisconnectIntegration', {
      apiId: this.webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${cdk.Stack.of(this).region}:lambda:path/2015-03-31/functions/${disconnectFn.functionArn}/invocations`,
    });
    
    const joinRoomIntegration = new apigatewayv2.CfnIntegration(this, 'JoinRoomIntegration', {
      apiId: this.webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${cdk.Stack.of(this).region}:lambda:path/2015-03-31/functions/${joinRoomFn.functionArn}/invocations`,
    });
    
    // Routes
    new apigatewayv2.CfnRoute(this, 'ConnectRoute', {
      apiId: this.webSocketApi.ref,
      routeKey: '$connect',
      authorizationType: 'NONE',
      target: `integrations/${connectIntegration.ref}`,
    });
    
    new apigatewayv2.CfnRoute(this, 'DisconnectRoute', {
      apiId: this.webSocketApi.ref,
      routeKey: '$disconnect',
      authorizationType: 'NONE',
      target: `integrations/${disconnectIntegration.ref}`,
    });
    
    new apigatewayv2.CfnRoute(this, 'JoinRoomRoute', {
      apiId: this.webSocketApi.ref,
      routeKey: 'joinRoom',
      authorizationType: 'NONE',
      target: `integrations/${joinRoomIntegration.ref}`,
    });
    
    // Stage
    this.webSocketStage = new apigatewayv2.CfnStage(this, 'WebSocketStage', {
      apiId: this.webSocketApi.ref,
      stageName: environmentName,
      autoDeploy: true,
    });
    
    // Grant permissions to invoke API Gateway Management API
    const apiGatewayManagementPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [`arn:aws:execute-api:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:${this.webSocketApi.ref}/${this.webSocketStage.stageName}/POST/@connections/*`],
    });
    
    disconnectFn.addToRolePolicy(apiGatewayManagementPolicy);
    joinRoomFn.addToRolePolicy(apiGatewayManagementPolicy);
    
    // Allow API Gateway to invoke the Lambda functions
    connectFn.addPermission('ConnectPermission', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:${this.webSocketApi.ref}/*/$connect`,
    });
    
    disconnectFn.addPermission('DisconnectPermission', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:${this.webSocketApi.ref}/*/$disconnect`,
    });
    
    joinRoomFn.addPermission('JoinRoomPermission', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:${this.webSocketApi.ref}/*/joinRoom`,
    });
    
    // Output the WebSocket URL
    new cdk.CfnOutput(this, 'WebSocketURL', {
      value: `wss://${this.webSocketApi.ref}.execute-api.${cdk.Stack.of(this).region}.amazonaws.com/${environmentName}`,
      description: 'WebSocket API URL',
    });
  }
}