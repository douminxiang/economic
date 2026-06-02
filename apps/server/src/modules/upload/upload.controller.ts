import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

const IMAGE_UPLOAD_OPTIONS = {
  limits: { fileSize: 5 * 1024 * 1024 },
};
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('mode')
  mode() {
    return {
      mockMode: this.uploadService.isMockMode,
      provider: this.uploadService.isMockMode ? 'local' : 'oss',
    };
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadImage(file);
  }

  /** AI 多模态对话图片 — 强制 OSS 存储 */
  @Post('image/ai')
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS))
  uploadAiImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
  ) {
    return this.uploadService.uploadAiImage(file, userId);
  }
}
