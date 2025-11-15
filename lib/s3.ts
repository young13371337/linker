import { S3Client } from '@aws-sdk/client-s3';

function buildEndpoint() {
  // Prefer explicit S3_ENDPOINT, fallback to MINIO_ENDPOINT (+ port/ssl if given)
  let endpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT;
  if (!endpoint) return undefined;

  // If endpoint already has protocol, return as-is (may include port)
  if (/^https?:\/\//i.test(endpoint)) return endpoint;

  // Otherwise build using MINIO_SSL / MINIO_PORT hints
  const ssl = (process.env.MINIO_SSL || 'false').toLowerCase() === 'true';
  const port = process.env.MINIO_PORT;
  return `${ssl ? 'https' : 'http'}://${endpoint}${port ? `:${port}` : ''}`;
}

export function createS3Client() {
  const endpoint = buildEndpoint();
  const region = process.env.S3_REGION || 'us-east-1';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;
  const forcePath = (process.env.S3_FORCE_PATH_STYLE || process.env.MINIO_FORCE_PATH_STYLE || 'true') === 'true';
  const bucket = process.env.S3_BUCKET || process.env.MINIO_BUCKET;

  // Require credentials and a bucket to consider S3 client usable
  if (!accessKeyId || !secretAccessKey || !bucket) return null;

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: forcePath,
  });
}

export function getS3Bucket() {
  return process.env.S3_BUCKET || process.env.MINIO_BUCKET || undefined;
}

export function getS3Endpoint() {
  return buildEndpoint();
}

export default createS3Client;
