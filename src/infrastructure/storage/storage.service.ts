import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export interface UploadResult {
  key: string; // storage path within the bucket — store THIS in the DB
  url: string | null; // public URL if public; null if private (use presigned on read)
  contentType: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly fileDir: string;
  private readonly endpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('SPACES_BUCKET_NAME');
    this.fileDir = this.configService.getOrThrow<string>('RECORDS_FILE_DIR');
    this.endpoint = this.configService.getOrThrow<string>('SPACES_ENDPOINT');

    // Singleton client — created once, reused for every operation
    this.client = new S3Client({
      region: this.configService.getOrThrow<string>('SPACES_REGION'),
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('SPACES_ACCESS_KEY'),
        secretAccessKey:
          this.configService.getOrThrow<string>('SPACES_SECRET_KEY'),
      },
    });
  }

  async upload(
    file: Express.Multer.File,
    options: { isPublic: boolean },
  ): Promise<UploadResult> {
    const extension =
      file.originalname?.split('.').pop()?.toLowerCase() ?? 'bin';
    const key = `${this.fileDir}/${randomUUID().replace(/-/g, '')}.${extension}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: options.isPublic
            ? ObjectCannedACL.public_read
            : ObjectCannedACL.private,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Upload failed for ${file.originalname}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('File upload failed.');
    }

    return {
      key,
      url: options.isPublic ? this.buildPublicUrl(key) : null,
      contentType: file.mimetype,
      size: file.size,
    };
  }

  /** Time-limited read URL for PRIVATE files (KYC docs). Default 5 minutes. */
  async getSignedReadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      // A failed delete shouldn't break the caller's flow — log for follow-up.
      this.logger.error(
        `Delete failed for ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private buildPublicUrl(key: string): string {
    // v3 PutObject returns no Location, so build the virtual-hosted URL:
    // https://<bucket>.<region>.digitaloceanspaces.com/<key>
    return `${this.endpoint.replace('https://', `https://${this.bucket}.`)}/${key}`;
  }
}
