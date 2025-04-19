import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkStack } from '../lib/cdk-stack';

describe('CdkStack', () => {
  let template: Template;
  
  beforeAll(() => {
    const app = new cdk.App({
      context: {
        environment: 'test'
      }
    });
    const stack = new CdkStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });
  
  test('DynamoDBテーブルが正しく作成される', () => {
    // 3つのDynamoDBテーブルが作成されること (Rooms, Comments, Connections)
    template.resourceCountIs('AWS::DynamoDB::Table', 3);
    
    // Roomsテーブルの検証
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'LiveComment-Rooms-test',
      KeySchema: [
        {
          AttributeName: 'roomId',
          KeyType: 'HASH'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST'
    });
    
    // Commentsテーブルの検証
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'LiveComment-Comments-test',
      KeySchema: [
        {
          AttributeName: 'roomId',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'commentId',
          KeyType: 'RANGE'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST'
    });
  });
  
  test('Lambda関数が正しく設定される', () => {
    // 5つのLambda関数が作成されること
    template.resourceCountIs('AWS::Lambda::Function', 8); // 5つのAPI関数 + 3つのWebSocket関数
    
    // CreateRoom関数の検証
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
      Environment: {
        Variables: {
          ROOMS_TABLE: {
            Ref: expect.stringMatching(/RoomsTable/)
          }
        }
      }
    });
    
    // PostComment関数の検証
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
      Environment: {
        Variables: {
          COMMENTS_TABLE: {
            Ref: expect.stringMatching(/CommentsTable/)
          }
        }
      }
    });
  });
  
  test('API Gatewayが正しく設定される', () => {
    // REST API Gatewayが作成されること
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    
    // WebSocket API Gatewayが作成されること
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
    
    // REST APIの検証
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'live-comment-api-test'
    });
  });
  
  test('フロントエンドリソースが正しく設定される', () => {
    // S3バケットが作成されること
    template.resourceCountIs('AWS::S3::Bucket', 1);
    
    // CloudFront Distributionが作成されること
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  });
});