import { Controller, Get, Post, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@ecommerce/shared-types';
import { PaginationDto } from '@common/dto/pagination.dto';
import { InvoiceService } from '../services/invoice.service';

@ApiTags('Admin - Invoices')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPS)
@Controller('admin/invoices')
export class AdminInvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'List all invoices' })
  async listAll(@Query() query: PaginationDto) {
    return this.invoiceService.findAll(query);
  }

  @Post('generate/:orderId')
  @ApiOperation({ summary: 'Generate invoice for an order' })
  async generate(@Param('orderId') orderId: string) {
    return this.invoiceService.generateInvoice(orderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details' })
  async getById(@Param('id') invoiceId: string) {
    return this.invoiceService.getInvoiceById(invoiceId);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice PDF' })
  async downloadPdf(
    @Param('id') invoiceId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const invoice = await this.invoiceService.getInvoiceById(invoiceId);
    const pdfBuffer = await this.invoiceService.generatePdf(invoiceId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    });

    return new StreamableFile(pdfBuffer);
  }
}
