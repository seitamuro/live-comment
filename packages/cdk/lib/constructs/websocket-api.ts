import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export interface WebSocketApiProps {
  environmentName: string;
  commentsTable: dynamodb.Table;
  connectionsTableName: string;
}

export class WebSocketApi extends Construct {
  public readonly webSocketApi: apigatewayv2.WebSocketApi;
  public readonly webSocketStage: apigatewayv2.WebSocketStage;
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
    const connectFn = new lambda.NodejsFunction(this, 'ConnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/connect/index.ts'),
    });
    
    const disconnectFn = new lambda.NodejsFunction(this, 'DisconnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/disconnect/index.ts'),
      environment: {
        CONNECTIONS_TABLE: this.connectionsTable.tableName,
      },
    });
    
    const joinRoomFn = new lambda.NodejsFunction(this, 'JoinRoomFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/join-room/index.ts'),
      environment: {
        CONNECTIONS_TABLE: this.connectionsTable.tableName,
        ROOMS_TABLE: commentsTable.tableName.replace('Comments', 'Rooms'),
      },
    });
    
    // Grant permissions
    this.connectionsTable.grantReadWriteData(disconnectFn);
    this.connectionsTable.grantReadWriteData(joinRoomFn);
    
    // WebSocket API
    this.webSocketApi = new apigatewayv2.WebSocketApi(this, 'WebSocketApi', {
      apiName: `live-comment-websocket-${environmentName}`,
      routeSelectionExpression: '$request.body.action',
      connectRouteOptions: {
        integration: new apigatewayv2_integrations.WebSocketLambdaIntegration('ConnectIntegration', connectFn),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2_integrations.WebSocketLambdaIntegration('DisconnectIntegration', disconnectFn),
      },
    });
    
    // Add route for joinRoom
    this.webSocketApi.addRoute('joinRoom', {
      integration: new apigatewayv2_integrations.WebSocketLambdaIntegration('JoinRoomIntegration', joinRoomFn),
    });
    
    // Create stage
    this.webSocketStage = new apigatewayv2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi: this.webSocketApi,
      stageName: environmentName,
      autoDeploy: true,
    });
    
    // Grant permissions to invoke API Gateway Management API
    const apiGatewayManagementPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [`arn:aws:execute-api:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:${this.webSocketApi.apiId}/${this.webSocketStage.stageName}/POST/@connections/*`],
    });
    
    disconnectFn.addToRolePolicy(apiGatewayManagementPolicy);
    joinRoomFn.addToRolePolicy(apiGatewayManagementPolicy);
    
    // Output the WebSocket URL
    new cdk.CfnOutput(this, 'WebSocketURL', {
      value: `wss://${this.webSocketApi.apiId}.execute-api.${cdk.Stack.of(this).region}.amazonaws.com/${environmentName}`,
      description: 'WebSocket API URL',
    });
  }
}