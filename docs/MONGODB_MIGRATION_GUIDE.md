# MongoDB Migration Guide

## Status: Identity Module Complete

The Identity module has been fully migrated from TypeORM/SQLite to MongoDB/Mongoose. Other modules still need migration.

## What's Been Done

### ✅ Completed
1. **Database Configuration**
   - Updated `database.config.ts` to include MongoDB connection string
   - Replaced TypeORM with Mongoose in `app.module.ts`
   - MongoDB connection configured to use: `mongodb+srv://edwinswanith006:Edwin006@e-commerce.xwgdl7x.mongodb.net/E-commerce`

2. **Identity Module**
   - Created MongoDB schemas:
     - `user.schema.ts`
     - `vendor.schema.ts`
     - `vendor-staff.schema.ts`
     - `refresh-token.schema.ts`
   - Updated services:
     - `users.service.ts` - Now uses Mongoose models
     - `auth.service.ts` - Now uses Mongoose models
   - Updated `identity.module.ts` to use MongooseModule

### ⚠️ Still Needs Migration

The following modules still use TypeORM and need to be migrated:

1. **Catalog Module** (`modules/catalog/`)
   - Product, Variant, Category, Brand, ProductImage, ProductAttribute entities
   - ProductService, VariantService, CategoryService, BrandService

2. **Offers Module** (`modules/offers/`)
   - Offer entity
   - OfferService

3. **Cart Module** (`modules/cart/`)
   - Cart, CartItem entities
   - CartService

4. **Orders Module** (`modules/orders/`)
   - Order, OrderItem, OrderStatusHistory entities
   - OrderService

5. **Payments Module** (`modules/payments/`)
   - Payment, PaymentAttempt, Refund entities
   - PaymentService

6. **Logistics Module** (`modules/logistics/`)
   - Shipment, ShipmentItem, ShipmentTrackingEvent entities
   - ShipmentService

7. **Reviews Module** (`modules/reviews/`)
   - Review, ReviewEligibility, ReviewMedia entities
   - ReviewService, ReviewEligibilityService

8. **Affiliate Module** (`modules/affiliate/`)
   - AffiliateLink, AffiliateClick, AffiliateCommission entities

9. **Admin Module** (`modules/admin/`)
   - AuditLog, PlatformSetting entities
   - AuditService, ApprovalQueueService

10. **Common Module** (`common/`)
    - Vendor entity reference (already migrated in Identity)

## Migration Pattern

For each module, follow this pattern:

### 1. Create MongoDB Schemas

Convert TypeORM entities to Mongoose schemas:

```typescript
// Before (TypeORM)
@Entity('products')
export class Product extends SoftDeletableEntity {
  @Column({ name: 'vendor_id', type: 'varchar', length: 36 })
  vendorId: string;
  // ...
}

// After (Mongoose)
@Schema({ collection: 'products', timestamps: true, _id: false })
export class Product {
  @Prop({ type: String, required: true, unique: true, _id: true })
  id: string;
  
  @Prop({ type: String, required: true, index: true })
  vendorId: string;
  // ...
}
export const ProductSchema = SchemaFactory.createForClass(Product);
```

### 2. Update Services

Replace TypeORM repositories with Mongoose models:

```typescript
// Before
@InjectRepository(Product)
private readonly productRepo: Repository<Product>;

async findById(id: string) {
  return this.productRepo.findOne({ where: { id } });
}

// After
@InjectModel(Product.name)
private readonly productModel: Model<ProductDocument>;

async findById(id: string) {
  return this.productModel.findOne({ id }).exec();
}
```

### 3. Update Module

Replace TypeOrmModule with MongooseModule:

```typescript
// Before
imports: [TypeOrmModule.forFeature([Product, Variant])]

// After
imports: [
  MongooseModule.forFeature([
    { name: Product.name, schema: ProductSchema },
    { name: Variant.name, schema: VariantSchema },
  ])
]
```

## Key Differences

### Query Syntax

| TypeORM | Mongoose |
|---------|----------|
| `findOne({ where: { id } })` | `findOne({ id }).exec()` |
| `findAndCount({ where, skip, take })` | `Promise.all([find().skip().limit(), countDocuments()])` |
| `update(id, data)` | `findOneAndUpdate({ id }, { $set: data }, { new: true })` |
| `save(entity)` | `new Model(data).save()` |
| `create(data)` | `new Model(data)` then `save()` |
| `Like('%search%')` | `{ $regex: 'search', $options: 'i' }` |

### Schema Differences

- MongoDB uses `_id` by default, but we're using `id` as the primary key
- Set `_id: false` in schema options and use `_id: true` on the `id` field
- Timestamps are handled by `timestamps: true` in schema options
- Indexes are defined using `Schema.index()` after schema creation

## Testing

After migrating each module:
1. Test CRUD operations
2. Test relationships/queries
3. Verify data integrity
4. Check pagination works correctly

## Notes

- All data has been migrated to MongoDB collections
- Collection names match SQLite table names (snake_case)
- Field names were converted from snake_case to camelCase during migration
- The `id` field is used as the primary key (not MongoDB's default `_id`)

