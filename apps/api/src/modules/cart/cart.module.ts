import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './schemas/cart.schema';
import { CartItem, CartItemSchema } from './schemas/cart-item.schema';
import { OffersModule } from '../offers/offers.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CartService } from './services/cart.service';
import { CartController } from './controllers/cart.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: CartItem.name, schema: CartItemSchema },
    ]),
    OffersModule,
    CatalogModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [MongooseModule, CartService],
})
export class CartModule {}
