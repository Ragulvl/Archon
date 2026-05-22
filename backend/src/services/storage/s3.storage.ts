import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env';
import { storageLogger } from '../../utils/logger';

// ─── S3 Client ───────────────────────────────────────────────────────────────
// On EC2 with an IAM instance profile, credentials are resolved automatically.
// For local dev, set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.
// We never hardcode credentials.

const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
  region: env.AWS_REGION,
  maxAttempts: 3, // Built-in retry with exponential backoff
};

// Only attach explicit credentials if both are provided (local dev fallback)
if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  clientConfig.credentials = {
    accessKeyId:     env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };
  storageLogger.debug('S3: using explicit credentials from environment');
} else {
  storageLogger.debug('S3: using IAM role / credential chain (EC2 instance profile)');
}

const s3 = new S3Client(clientConfig);
const BUCKET = env.AWS_S3_BUCKET;

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function uploadToS3(
  key: string,
  content: string | Buffer,
  contentType = 'application/json',
  metadata?: Record<string, string>
): Promise<string> {
  const body = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        body,
    ContentType: contentType,
    Metadata:    metadata,
  }));

  storageLogger.debug(`S3 upload: s3://${BUCKET}/${key} (${body.length} bytes)`);
  return `s3://${BUCKET}/${key}`;
}

// ─── Download ─────────────────────────────────────────────────────────────────

export async function downloadFromS3(key: string): Promise<string> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`S3 object not found: ${key}`);

  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  const content = Buffer.concat(chunks).toString('utf-8');
  storageLogger.debug(`S3 download: s3://${BUCKET}/${key} (${content.length} chars)`);
  return content;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  storageLogger.debug(`S3 delete: s3://${BUCKET}/${key}`);
}

// ─── Presigned URL ────────────────────────────────────────────────────────────

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  );
  storageLogger.debug(`S3 presigned URL generated for: ${key} (expires ${expiresIn}s)`);
  return url;
}

// ─── Object Exists Check ─────────────────────────────────────────────────────

export async function s3ObjectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function pingS3(): Promise<{ ok: boolean; bucket: string }> {
  try {
    await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 1 }));
    return { ok: true, bucket: BUCKET };
  } catch (err) {
    storageLogger.error('S3 health check failed:', err);
    return { ok: false, bucket: BUCKET };
  }
}

// ─── Key Helpers ─────────────────────────────────────────────────────────────

export function buildArtifactKey(projectId: string, artifactId: string): string {
  return `artifacts/${projectId}/${artifactId}.json`;
}

export function buildFileKey(projectId: string, artifactId: string, filePath: string): string {
  return `files/${projectId}/${artifactId}/${filePath}`;
}
