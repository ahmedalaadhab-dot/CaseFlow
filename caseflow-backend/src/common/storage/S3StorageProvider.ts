import { randomUUID } from "crypto";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageProvider } from "./StorageProvider";
import { env } from "../../config/env";

// Works against AWS S3 or any S3-compatible endpoint (Cloudflare R2,
// Backblaze B2, MinIO, ...) — set S3_ENDPOINT for the latter.
//
// Documents here are government ID scans (passports, CPRs), so this
// intentionally keeps the bucket private and hands out short-lived signed
// URLs per request rather than making objects/bucket public.
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly signedUrlTtlSeconds = 15 * 60;

  constructor() {
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY to be set.");
    }

    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION || "auto", // R2 ignores region and expects "auto"
      endpoint: env.S3_ENDPOINT, // undefined -> real AWS S3
      forcePathStyle: !!env.S3_ENDPOINT, // most S3-compatible providers need path-style addressing
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async save({ buffer, originalName, caseId }: { buffer: Buffer; originalName: string; caseId: string }): Promise<string> {
    const ext = path.extname(originalName);
    const key = `${caseId}/${randomUUID()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
      })
    );

    return key;
  }

  async read(storageKey: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }));
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }

  async getUrl(storageKey: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }), {
      expiresIn: this.signedUrlTtlSeconds,
    });
  }
}
