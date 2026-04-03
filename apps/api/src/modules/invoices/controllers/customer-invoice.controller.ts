import { Controller, Get, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@ecommerce/shared-types';
import { PaginationDto } from '@common/dto/pagination.dto';
import { InvoiceService } from '../services/invoice.service';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class CustomerInvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'List my invoices' })
  async listInvoices(
    @CurrentUser() user: { sub: string },
    @Query() query: PaginationDto,
  ) {
    return this.invoiceService.findByUser(user.sub, query);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get invoice for an order' })
  async getByOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: { sub: string },
  ) {
    const invoice = await this.invoiceService.getInvoiceByOrderId(orderId);
    if (invoice.userId !== user.sub) {
      throw new Error('Invoice does not belong to you');
    }
    return invoice;
  }

  @Get('order/:orderId/pdf')
  @ApiOperation({ summary: 'Download invoice PDF for an order' })
  async downloadPdfByOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: { sub: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Verify ownership via invoice lookup
    let invoice = await this.invoiceService.getInvoiceByOrderId(orderId).catch(() => null);
    if (invoice && invoice.userId !== user.sub) {
      throw new Error('Invoice does not belong to you');
    }

    const pdfBuffer = await this.invoiceService.generatePdfByOrderId(orderId);
    invoice = await this.invoiceService.getInvoiceByOrderId(orderId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    });

    return new StreamableFile(pdfBuffer);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice PDF by invoice ID' })
  async downloadPdf(
    @Param('id') invoiceId: string,
    @CurrentUser() user: { sub: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const invoice = await this.invoiceService.getInvoiceById(invoiceId);
    if (invoice.userId !== user.sub) {
      throw new Error('Invoice does not belong to you');
    }

    const pdfBuffer = await this.invoiceService.generatePdf(invoiceId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    });

    return new StreamableFile(pdfBuffer);
  }
}
