#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || 'dev';

new CdkStack(app, `LiveCommentStack-${environment}`, {
  /* Use current AWS account and region by default */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1'
  },
  
  /* You can specify tags for all resources in the stack */
  tags: {
    Environment: environment,
    Project: 'LiveComment',
  },
});