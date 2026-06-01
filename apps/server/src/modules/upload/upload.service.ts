import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
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
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('仅支持 JPG/PNG/WEBP 格式的图片');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('图片大小不能超过 5MB');
    }

    const ext = path.extname(file.originalname) || '.png';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;

    if (this.isMockMode) {
      const result = await this.uploadToLocal(file, filename);
      return { ...result, mockMode: true };
    }

    const result = await this.uploadToOss(file, filename);
    return { ...result, mockMode: false };
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
      ...(this.ossEndpoint ? { endpoint: this.ossEndpoint } : {}),
    });
  }

  private async uploadToOss(
    file: Express.Multer.File,
    filename: string,
  ): Promise<{ url: string }> {
    const objectKey = `uploads/${filename}`;

    try {
      const client = this.createOssClient();
      const result = await client.put(objectKey, file.buffer, {
        headers: { 'Content-Type': file.mimetype },
      });

      const url = this.buildPublicUrl(objectKey, result.url);
      this.logger.log(`OSS uploaded: ${objectKey}`);
      return { url };
    } catch (error) {
      this.logger.error('OSS upload failed', error);
      throw new InternalServerErrorException('文件上传失败，请检查 OSS 配置');
    }
  }

  private buildPublicUrl(objectKey: string, fallbackUrl: string): string {
    const raw = this.ossPublicBaseUrl
      ? `${this.ossPublicBaseUrl.replace(/\/$/, '')}/${objectKey}`
      : fallbackUrl;
    return raw.replace(/^http:\/\//i, 'https://');
  }
}
