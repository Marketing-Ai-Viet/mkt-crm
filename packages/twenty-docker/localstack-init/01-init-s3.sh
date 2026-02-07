#!/bin/bash
# Create S3 bucket for local development

BUCKET_NAME="crm-files-local"
REGION="ap-southeast-1"

echo "Creating S3 bucket: ${BUCKET_NAME}..."
awslocal s3 mb "s3://${BUCKET_NAME}" --region "${REGION}"

echo "S3 bucket created successfully."
awslocal s3 ls
