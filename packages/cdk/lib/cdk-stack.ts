import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { WebSocketApi } from './constructs/websocket-api';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Environment name (dev, prod)
    const environmentName = this.node.tryGetContext('environment') || 'dev';
    
    // DynamoDB Tables
    const roomsTable = new dynamodb.Table(this, 'RoomsTable', {
      tableName: `LiveComment-Rooms-${environmentName}`,
      partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environmentName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });
    
    const commentsTable = new dynamodb.Table(this, 'CommentsTable', {
      tableName: `LiveComment-Comments-${environmentName}`,
      partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'commentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environmentName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });
    
    // Lambda Functions
    const createRoomFunction = new lambda.Function(this, 'CreateRoomFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/create-room'),
      environment: {
        ROOMS_TABLE: roomsTable.tableName,
      },
    });
    
    const postCommentFunction = new lambda.Function(this, 'PostCommentFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/post-comment'),
      environment: {
        COMMENTS_TABLE: commentsTable.tableName,
      },
    });
    
    const getRoomCommentsFunction = new lambda.Function(this, 'GetRoomCommentsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/get-room-comments'),
      environment: {
        COMMENTS_TABLE: commentsTable.tableName,
      },
    });
    
    const closeRoomFunction = new lambda.Function(this, 'CloseRoomFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/close-room'),
      environment: {
        ROOMS_TABLE: roomsTable.tableName,
      },
    });
    
    const getUserRoomsFunction = new lambda.Function(this, 'GetUserRoomsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X, 
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/get-user-rooms'),
      environment: {
        ROOMS_TABLE: roomsTable.tableName,
      },
    });
    
    // Grant DynamoDB Permissions
    roomsTable.grantReadWriteData(createRoomFunction);
    roomsTable.grantReadWriteData(closeRoomFunction);
    roomsTable.grantReadData(getUserRoomsFunction);
    commentsTable.grantReadWriteData(postCommentFunction);
    commentsTable.grantReadData(getRoomCommentsFunction);
    
    // REST API Gateway
    const api = new apigateway.RestApi(this, 'LiveCommentApi', {
      restApiName: `live-comment-api-${environmentName}`,
      description: 'API for Live Comment Application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });
    
    // API Resources and Methods
    const roomsResource = api.root.addResource('rooms');
    const singleRoomResource = roomsResource.addResource('{roomId}');
    const commentsResource = singleRoomResource.addResource('comments');
    
    roomsResource.addMethod('POST', new apigateway.LambdaIntegration(createRoomFunction));
    roomsResource.addMethod('GET', new apigateway.LambdaIntegration(getUserRoomsFunction));
    commentsResource.addMethod('POST', new apigateway.LambdaIntegration(postCommentFunction));
    commentsResource.addMethod('GET', new apigateway.LambdaIntegration(getRoomCommentsFunction));
    singleRoomResource.addMethod('PATCH', new apigateway.LambdaIntegration(closeRoomFunction));
    
    // WebSocket API for Real-time Communication
    const webSocketApi = new WebSocketApi(this, 'LiveCommentWebSocketApi', {
      environmentName,
      commentsTable,
      connectionsTableName: `LiveComment-Connections-${environmentName}`,
    });
    
    // Update post-comment Lambda to notify WebSocket connections
    postCommentFunction.addEnvironment('WEBSOCKET_API_ENDPOINT', `https://${webSocketApi.webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/${environmentName}`);
    postCommentFunction.addEnvironment('CONNECTIONS_TABLE', webSocketApi.connectionsTable.tableName);
    
    // Grant permissions
    webSocketApi.connectionsTable.grantReadData(postCommentFunction);
    
    // Add policy to allow postCommentFunction to call WebSocket API
    const apiGatewayManagementPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.webSocketApi.ref}/${webSocketApi.webSocketStage.stageName}/POST/@connections/*`],
    });
    postCommentFunction.addToRolePolicy(apiGatewayManagementPolicy);
    
    // S3 Bucket for Frontend Hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `live-comment-website-${environmentName}-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      removalPolicy: environmentName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });
    
    // CloudFront Distribution for Frontend
    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });
    
    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
    
    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Website URL',
    });
  }
}
