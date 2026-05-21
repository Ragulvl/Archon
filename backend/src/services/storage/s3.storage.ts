import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env';
import { storageLogger } from '../../utils/logger';

// Uses instance profile on EC2 — no explicit credentials needed
const s3 = new S3Client({ region: env.AWS_REGION });
const BUCKET = env.AWS_S3_BUCKET;

export async function uploadToS3(
  key: string,
  content: string | Buffer,
  contentType = 'application/json'
): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        typeof content === 'string' ? Buffer.from(content, 'utf-8') : content,
    ContentType: contentType,
  }));

  storageLogger.debug(`Uploaded to S3: ${key}`);
  return `s3://${BUCKET}/${key}`;
}

export async function downloadFromS3(key: string): Promise<string> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = res.Body;
  if (!body) throw new Error(`S3 object not found: ${key}`);

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  storageLogger.debug(`Deleted from S3: ${key}`);
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
}

export function buildArtifactKey(projectId: string, artifactId: string): string {
  return `artifacts/${projectId}/${artifactId}.json`;
}
