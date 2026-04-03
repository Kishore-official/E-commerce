# MongoDB Image Distribution by Category

**Date:** 2026-03-03  
**Total Images in Database:** 18,241

---

## Complete Image Distribution by Category

| Rank | Category Name | Total Images | Percentage |
|------|---------------|--------------|------------|
| **1** | **Baby Essentials** | **6,096** | **33.4%** |
| **2** | **Food & Pantry** | **1,436** | **7.9%** |
| **3** | **Toys & Stationery** | **1,435** | **7.9%** |
| **4** | **Kitchen & Storage** | **1,428** | **7.8%** |
| **5** | **Pet Care** | **1,425** | **7.8%** |
| **6** | **Fitness & Gear** | **1,423** | **7.8%** |
| **7** | **Electronics** | **1,126** | **6.2%** |
| **8** | **Beauty & Health** | **851** | **4.7%** |
| **9** | **Fashion** | **836** | **4.6%** |
| **10** | **Men's Clothing** | **602** | **3.3%** |
| **11** | **Personal Care** | **594** | **3.3%** |
| **12** | **Laptops** | **301** | **1.6%** |
| **13** | **Smartphones** | **301** | **1.6%** |
| **14** | **QA Test Category 33c5** | **278** | **1.5%** |

**Total:** 18,241 images

---

## Key Findings

### Top 3 Categories (67.2% of all images)
1. **Baby Essentials** - 6,096 images (33.4%)
2. **Food & Pantry** - 1,436 images (7.9%)
3. **Toys & Stationery** - 1,435 images (7.9%)

### Category Distribution
- **14 categories** have images assigned
- **Baby Essentials** dominates with over 6,000 images
- Most categories have 1,400-1,500 images each
- Electronics, Beauty & Health, and Fashion have 800-1,100 images
- Smaller categories (Laptops, Smartphones) have ~300 images each

---

## Data Structure Notes

### Image-Product Linking
- Images are linked to products via `productId` field
- Two linking methods exist:
  1. **ObjectId** (18,132 images) - Links via `products._id` (MongoDB default)
  2. **UUID String** (109 images) - Links via `products.id` (application UUID)

### Product-Category Linking
- Products link to categories via `categoryId` field (UUID string)
- All 18,241 images belong to products that have categories assigned
- **No orphaned images** - all images are properly linked to categorized products

---

## Recommendations

1. **Standardize Image Linking**: Consider standardizing on one method (either ObjectId or UUID) for consistency
2. **Category Balance**: Baby Essentials has significantly more images than other categories - consider if this is expected
3. **QA Categories**: Remove or reassign products from "QA Test Category 33c5" to proper categories

---

## Next Steps

1. Review products in "Baby Essentials" to verify they're correctly categorized
2. Check if any products need category reassignment
3. Consider creating subcategories if categories are too broad
4. Clean up test/QA categories

