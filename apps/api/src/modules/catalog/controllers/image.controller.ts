import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Public } from '@common/decorators';
import { ProductImage, ProductImageDocument } from '../schemas/product-image.schema';

function detectMimeType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
  if (buf.length >= 12 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = buf.slice(8, 12).toString('ascii');
    if (brand.startsWith('avif') || brand.startsWith('avis')) return 'image/avif';
    if (brand.startsWith('heic') || brand.startsWith('heix') || brand.startsWith('mif1')) return 'image/heif';
  }
  return null;
}

function toBuffer(imageData: unknown): Buffer {
  if (Buffer.isBuffer(imageData)) return imageData;
  if (imageData instanceof Uint8Array) return Buffer.from(imageData);
  if (imageData && typeof imageData === 'object' && (imageData as any).buffer) {
    return Buffer.from((imageData as any).buffer);
  }
  return Buffer.from(imageData as any);
}

@ApiTags('Images')
@Controller('images')
export class ImageController {
  constructor(
    @InjectModel(ProductImage.name)
    private readonly imageModel: Model<ProductImageDocument>,
  ) {}

  @Public()
  @Get(':imageId')
  @ApiOperation({ summary: 'Serve product image from MongoDB' })
  @ApiResponse({ status: 200, description: 'Image binary' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async serveImage(
    @Param('imageId') imageId: string,
    @Res() res: Response,
  ): Promise<void> {
    const image = await this.imageModel
      .findOne({ id: imageId })
      .select('+imageData mimeType')
      .exec();

    if (!image || !image.imageData) {
      throw new NotFoundException('Image not found');
    }

    const imageBuffer = toBuffer((image as any).imageData);
    const mimeType = detectMimeType(imageBuffer) || image.mimeType || 'image/jpeg';

    res.set({
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': imageBuffer.length.toString(),
    });
    res.end(imageBuffer);
  }
}
