# Database Verification - Product Images

## Database Location
- **Path**: `D:\E-commerce\data\ecommerce.sqlite`
- **Type**: SQLite (better-sqlite3)
- **Mode**: Development (synchronize: true)

## Product Images Storage

### Database Table: `product_images`
All product image metadata is stored in SQLite:

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(36) | UUID primary key |
| `product_id` | VARCHAR(36) | Foreign key to products table |
| `variant_id` | VARCHAR(36) | Optional variant association |
| `url` | VARCHAR(500) | Image URL (points to file location) |
| `alt_text` | VARCHAR(255) | Alt text for accessibility |
| `sort_order` | INTEGER | Display order |
| `is_primary` | BOOLEAN | Primary image flag |
| `created_at` | DATETIME | Creation timestamp |

### File Storage
- **Location**: `apps/api/uploads/products/`
- **Purpose**: Actual image files are stored here
- **URL Format**: `http://localhost:3000/uploads/products/{uuid}.{ext}`

### How It Works
1. **File Upload**: Image file is saved to `uploads/products/` folder
2. **Database Entry**: Metadata (URL, productId, etc.) is saved to `product_images` table
3. **Relationship**: Images are linked to products via `product_id` foreign key

## Verification Queries

### Check if table exists:
```sql
SELECT name FROM sqlite_master WHERE type='table' AND name='product_images';
```

### View all product images:
```sql
SELECT * FROM product_images;
```

### View images for a specific product:
```sql
SELECT * FROM product_images WHERE product_id = 'YOUR_PRODUCT_ID';
```

### Count images per product:
```sql
SELECT product_id, COUNT(*) as image_count 
FROM product_images 
GROUP BY product_id;
```

## Entity Configuration
- **Entity**: `ProductImage` (TypeORM)
- **Relations**: Many-to-One with `Product`
- **Cascade Delete**: Images are deleted when product is deleted
- **Auto-load**: Enabled via `autoLoadEntities: true`

## Current Status
✅ Database table structure is correct
✅ Entity relationships are configured
✅ Service saves images to database
✅ Files are stored separately in uploads folder
✅ URLs are saved in database pointing to file locations

