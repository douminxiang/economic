import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  private readonly ossRegion: string;
  private readonly ossBucket: string;
  private readonly ossAccessKeyId: string;
  private readonly ossAccessKeySecret: string;
  private readonly isMockMode: boolean;
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.ossRegion = this.configService.get('OSS_REGION', '');
    this.ossBucket = this.configService.get('OSS_BUCKET', '');
    this.ossAccessKeyId = this.configService.get('OSS_ACCESS_KEY_ID', '');
    this.ossAccessKeySecret = this.configService.get('OSS_ACCESS_KEY_SECRET', '');
    this.isMockMode = !this.ossAccessKeyId || !this.ossAccessKeySecret;

    // Mock mode: save to local uploads directory
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (this.isMockMode && !fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('仅支持 JPG/PNG/WEBP 格式的图片');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('图片大小不能超过 5MB');
    }

    const ext = path.extname(file.originalname) || '.png';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;

    if (this.isMockMode) {
      return this.uploadToLocal(file, filename);
    }

    return this.uploadToOss(file, filename);
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    filename: string,
  ): Promise<{ url: string }> {
    const filepath = path.join(this.uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    // Return a local URL path (served by static middleware or dev proxy)
    const port = this.configService.get('PORT', 3000);
    const baseUrl = this.configService.get('PUBLIC_BASE_URL', `http://localhost:${port}`);
    const url = `${baseUrl.replace(/\/$/, '')}/uploads/${filename}`;
    return { url };
  }

  private async uploadToOss(
    file: Express.Multer.File,
    filename: string,
  ): Promise<{ url: string }> {
    // TODO: Implement real OSS upload when credentials are available
    // const client = new OSS({
    //   region: this.ossRegion,
    //   accessKeyId: this.ossAccessKeyId,
    //   accessKeySecret: this.ossAccessKeySecret,
    //   bucket: this.ossBucket,
    // });
    // const result = await client.put(`uploads/${filename}`, file.buffer);
    // return { url: result.url };

    // Fallback to local for now
    return this.uploadToLocal(file, filename);
  }
}
