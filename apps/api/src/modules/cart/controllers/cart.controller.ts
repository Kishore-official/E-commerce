import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CartService } from '../services/cart.service';
import { AddCartItemDto, UpdateCartItemDto, MergeCartDto, CartResponseDto } from '../dto';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get active cart (guest or authenticated)' })
  async getCart(
    @CurrentUser() user: JwtPayload | undefined,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<CartResponseDto> {
    return this.cartService.getActiveCart(user?.sub || null, sessionId || null);
  }

  @Post('items')
  @Public()
  @ApiOperation({ summary: 'Add item to cart (guest or authenticated)' })
  async addItem(
    @CurrentUser() user: JwtPayload | undefined,
    @Body() dto: AddCartItemDto,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<CartResponseDto> {
    return this.cartService.addItem(user?.sub || null, sessionId || null, dto);
  }

  @Patch('items/:id')
  @Public()
  @ApiOperation({ summary: 'Update item quantity (guest or authenticated)' })
  async updateItem(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<CartResponseDto> {
    return this.cartService.updateItemQuantity(
      id,
      user?.sub || null,
      sessionId || null,
      dto,
    );
  }

  @Delete('items/:id')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from cart (guest or authenticated)' })
  async removeItem(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<void> {
    await this.cartService.removeItem(id, user?.sub || null, sessionId || null);
  }

  @Delete()
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear entire cart (guest or authenticated)' })
  async clearCart(
    @CurrentUser() user: JwtPayload | undefined,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<void> {
    await this.cartService.clearCart(user?.sub || null, sessionId || null);
  }

  @Post('merge')
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Merge guest cart into authenticated cart' })
  async mergeCart(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MergeCartDto,
  ): Promise<CartResponseDto> {
    return this.cartService.mergeGuestCart(user.sub, dto.sessionId);
  }
}
