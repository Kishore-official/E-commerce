import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateOfferDto } from './create-offer.dto';

export class UpdateOfferDto extends PartialType(
  OmitType(CreateOfferDto, [
    'productId',
    'variantId',
    'offerType',
    'countryCode',
  ] as const),
) {}
