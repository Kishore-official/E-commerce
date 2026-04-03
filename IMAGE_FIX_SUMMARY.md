# Image Display Fix Summary

## Problem Identified

When clicking on products from the "Browse by Category" section, only 3-5 images were showing per product, even though MongoDB contains 100+ images per product.

## Root Cause

The issue was a mismatch between how images were uploaded and how they were queried:

1. **Upload Scripts**: Used `productId: product._id || product.id`, which resulted in images being stored with MongoDB's `_id` (ObjectId string) as the `productId`
2. **API Query**: Only queried for `productId: product.id` (UUID string), missing all images stored with the ObjectId format

## Solution

Updated the API services to query for **both** productId formats:

1. **StorefrontService** (`apps/api/src/modules/storefront/services/storefront.service.ts`):
   - Updated `findProductDetail()` method to query images using `$or` condition checking both `product.id` and `product._id.toString()`

2. **ProductService** (`apps/api/src/modules/catalog/services/product.service.ts`):
   - Updated `findOneByVendor()` method to query images using `$or` condition checking both formats

## Code Changes

### StorefrontService.findProductDetail()

```typescript
// Before:
this.imageModel.find({ productId: product.id }).sort({ sortOrder: 1 }).exec(),

// After:
const productIdQuery = {
  $or: [
    { productId: product.id },
    { productId: (product as any)._id?.toString() || String((product as any)._id) },
  ],
};
this.imageModel.find(productIdQuery).sort({ sortOrder: 1 }).exec(),
```

### ProductService.findOneByVendor()

Same fix applied to ensure consistency across all product queries.

## Expected Result

After restarting the API server, all products should now display **all** their images (100+ images per product) instead of just 3-5 images.

## Next Steps

1. Restart the API server to apply changes
2. Clear browser cache or hard refresh the product pages
3. Verify that products now show all their images

## Files Modified

- `apps/api/src/modules/storefront/services/storefront.service.ts`
- `apps/api/src/modules/catalog/services/product.service.ts`

