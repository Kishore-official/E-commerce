import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { StorageService } from '@common/services/storage.service';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @Get(':folder/:filename')
  @ApiOperation({ summary: 'Serve uploaded file from GridFS' })
  async serveFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = `${folder}/${filename}`;
    try {
      const { stream, contentType } = await this.storageService.getFileStream(key);
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=31536000');
      stream.pipe(res);
    } catch {
      throw new NotFoundException('File not found');
    }
  }
}
