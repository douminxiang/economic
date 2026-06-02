import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OSS from 'ali-oss';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  readonly isMockMode: boolean;
  private readonly ossRegion: string;
  private readonly ossBucket: string;
  private readonly ossAccessKeyId: string;
  private readonly ossAccessKeySecret: string;
  private readonly ossEndpoint: string;
  private readonly ossPublicBaseUrl: string;
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.ossRegion = this.configService.get<string>('OSS_REGION', '').trim();
    this.ossBucket = this.configService.get<string>('OSS_BUCKET', '').trim();
    this.ossAccessKeyId = this.configService.get<string>('OSS_ACCESS_KEY_ID', '').trim();
    this.ossAccessKeySecret = this.configService.get<string>('OSS_ACCESS_KEY_SECRET', '').trim();
    this.ossEndpoint = this.configService.get<string>('OSS_ENDPOINT', '').trim();
    this.ossPublicBaseUrl = this.configService.get<string>('OSS_PUBLIC_BASE_URL', '').trim();

    this.isMockMode =
      !this.ossAccessKeyId ||
      !this.ossAccessKeySecret ||
      !this.ossBucket ||
      !this.ossRegion;

    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (this.isMockMode && !fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log('OSS mock mode — files saved to local uploads/');
    } else if (!this.isMockMode) {
      this.logger.log(`OSS upload enabled: bucket=${this.ossBucket}, region=${this.ossRegion}`);
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string; mockMode: boolean }> {
    return this.uploadImageInternal(file);
  }

  /** AI 多模态对话专用：必须写入 OSS，不允许本地 Mock */
  async uploadAiImage(
    file: Express.Multer.File,
    userId: number,
  ): Promise<{ url: string; objectKey: string; storage: 'oss' }> {
    if (this.isMockMode) {
      throw new ServiceUnavailableException(
        'AI 多模态图片需要 OSS 存储，请在 .env 配置 OSS_REGION、OSS_BUCKET、OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET',
      );
    }

    const validated = this.validateImageFile(file);
    const objectKey = `ai/chat/${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}${validated.ext}`;
    const { url } = await this.uploadToOss(file, validated.filename, objectKey);
    this.logger.log(`AI image stored in OSS: ${objectKey}`);
    return { url, objectKey, storage: 'oss' };
  }

  isOssPublicUrl(url: string): boolean {
    if (!url?.startsWith('https://')) return false;
    if (this.ossPublicBaseUrl && url.startsWith(this.ossPublicBaseUrl.replace(/\/$/, ''))) {
      return true;
    }
    if (this.ossBucket && url.includes(`${this.ossBucket}.`)) {
      return true;
    }
    return /\.aliyuncs\.com\//i.test(url);
  }

  private uploadImageInternal(file: Express.Multer.File): Promise<{ url: string; mockMode: boolean }> {
    const validated = this.validateImageFile(file);
    const { filename } = validated;

    if (this.isMockMode) {
      return this.uploadToLocal(file, filename).then((result) => ({ ...result, mockMode: true }));
    }

    return this.uploadToOss(file, filename).then((result) => ({ ...result, mockMode: false }));
  }

  private validateImageFile(file: Express.Multer.File): { ext: string; filename: string } {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const mime = file.mimetype?.toLowerCase() || '';
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    const mimeOk =
      allowedMimeTypes.includes(mime) ||
      mime === 'application/octet-stream' ||
      (!mime && ['.jpg', '.jpeg', '.png', '.webp'].includes(ext));
    if (!mimeOk) {
      throw new BadRequestException('仅支持 JPG/PNG/WEBP 格式的图片');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('图片大小不能超过 5MB');
    }

    const fileExt = ext || '.png';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExt}`;
    return { ext: fileExt, filename };
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    filename: string,
  ): Promise<{ url: string }> {
    const filepath = path.join(this.uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    const port = this.configService.get('PORT', 3000);
    const baseUrl = this.configService.get('PUBLIC_BASE_URL', `http://localhost:${port}`);
    const url = `${baseUrl.replace(/\/$/, '')}/uploads/${filename}`;
    return { url };
  }

  private createOssClient(): OSS {
    return new OSS({
      region: this.ossRegion,
      accessKeyId: this.ossAccessKeyId,
      accessKeySecret: this.ossAccessKeySecret,
      bucket: this.ossBucket,
      secure: true,
      timeout: 60000,
      ...(this.ossEndpoint ? { endpoint: this.ossEndpoint } : {}),
    });
  }

  private resolveContentType(file: Express.Multer.File): string {
    const mime = file.mimetype?.toLowerCase() || '';
    if (mime && mime !== 'application/octet-stream') return mime;
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    return 'image/jpeg';
  }

  private getFileBuffer(file: Express.Multer.File): Buffer {
    if (file.buffer?.length) return file.buffer;
    if (file.path && fs.existsSync(file.path)) return fs.readFileSync(file.path);
    throw new BadRequestException('文件数据为空，请重新选择图片');
  }

  private isRetryableOssError(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    const message = String((error as Error)?.message || '');
    if (code === 'RequestError' || code === 'ConnectionTimeoutError') return true;
    return /ENOTFOUND|ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang up/i.test(message);
  }

  private formatOssError(error: unknown): string {
    const message = String((error as Error)?.message || '');
    const code = (error as { code?: string })?.code;

    if (/ENOTFOUND|ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang up/i.test(message)) {
      return '网络暂时无法连接阿里云 OSS，请检查网络后重试';
    }
    if (code === 'InvalidAccessKeyId' || /AccessKeyId/i.test(message)) {
      return 'OSS AccessKey 无效，请检查 .env 中的 OSS_ACCESS_KEY_ID';
    }
    if (code === 'NoSuchBucket' || /NoSuchBucket/i.test(message)) {
      return `OSS Bucket "${this.ossBucket}" 不存在或与区域不匹配`;
    }
    if (/AccessDenied|Forbidden/i.test(message)) {
      return 'OSS 权限不足，请为 RAM 用户授予该 Bucket 的写入权限';
    }
    return '文件上传失败，请稍后重试';
  }

  private async uploadToOss(
    file: Express.Multer.File,
    filename: string,
    objectKey = `uploads/${filename}`,
  ): Promise<{ url: string }> {
    const buffer = this.getFileBuffer(file);
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const client = this.createOssClient();
        const result = await client.put(objectKey, buffer, {
          headers: { 'Content-Type': this.resolveContentType(file) },
        });

        const url = this.buildPublicUrl(objectKey, result.url);
        this.logger.log(`OSS uploaded: ${objectKey}`);
        return { url };
      } catch (error) {
        lastError = error;
        const retryable = this.isRetryableOssError(error);
        this.logger.warn(
          `OSS upload attempt ${attempt}/${maxAttempts} failed${retryable ? ' (retryable)' : ''}`,
          error,
        );
        if (!retryable || attempt === maxAttempts) break;
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }

    this.logger.error('OSS upload failed', lastError);
    throw new InternalServerErrorException(this.formatOssError(lastError));
  }

  private buildPublicUrl(objectKey: string, fallbackUrl: string): string {
    const raw = this.ossPublicBaseUrl
      ? `${this.ossPublicBaseUrl.replace(/\/$/, '')}/${objectKey}`
      : fallbackUrl;
    return raw.replace(/^http:\/\//i, 'https://');
  }
}
