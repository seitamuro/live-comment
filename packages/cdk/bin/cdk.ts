#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';

const app = new cdk.App();

// 環境変数からdeploy環境を取得（デフォルトはdev）
const environment = process.env.ENVIRONMENT || 'dev';

new CdkStack(app, `LiveCommentStack-${environment}`, {
  /* AWSアカウントとリージョンを設定 */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1'
  },
  
  /* すべてのリソースに適用するタグ */
  tags: {
    Environment: environment,
    Project: 'LiveComment',
  },
});