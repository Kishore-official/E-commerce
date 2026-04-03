# Verify Categories Display Guide

## ✅ What Was Updated

1. **Backend API**: New endpoint `/api/v1/catalog/categories/all-with-images` returns all categories with image counts
2. **Frontend**: "Shop by Category" section now displays all 14 categories with images and counts

## 🧪 Manual Testing Steps

### Step 1: Verify API Endpoint

Open in browser or use curl:
```
http://localhost:3000/api/v1/catalog/categories/all-with-images
```

**Expected Response:**
- Array of 14 categories
- Each category has: `id`, `name`, `slug`, `imageCount`, `sampleImageUrl`
- Categories sorted by image count

### Step 2: Check Storefront Homepage

1. **Open**: http://localhost:3001
2. **Scroll down** to "Shop by Category" section
3. **Verify**:
   - ✅ All 14 categories are displayed
   - ✅ Categories show image counts (e.g., "6,139 images")
   - ✅ Category images appear as background (if available)
   - ✅ Categories are sorted by image count (highest first)

### Step 3: Test Category Click

1. **Click** on any category (e.g., "Baby Essentials")
2. **Verify**:
   - ✅ URL changes to `/categories/baby-essentials`
   - ✅ Category page loads
   - ✅ Products are displayed
   - ✅ Product images are visible
   - ✅ All images load correctly

### Step 4: Verify Images in Category

1. **Navigate** to: http://localhost:3001/categories/baby-essentials
2. **Check**:
   - ✅ Products have images
   - ✅ Images load without errors
   - ✅ Image count matches expected (6,139 for Baby Essentials)
   - ✅ Product cards display correctly

## 📊 Expected Categories (14 total)

| Category | Expected Images |
|----------|----------------|
| Baby Essentials | 6,139 |
| Food & Pantry | 1,443 |
| Toys & Stationery | 1,442 |
| Kitchen & Storage | 1,435 |
| Pet Care | 1,432 |
| Fitness & Gear | 1,430 |
| Electronics | 1,129 |
| Beauty & Health | 854 |
| Fashion | 839 |
| Men's Clothing | 611 |
| Personal Care | 598 |
| Smartphones | 307 |
| Laptops | 304 |
| QA Test Category 33c5 | 278 |

## 🔍 Troubleshooting

### Categories Not Showing
- Check API is running: http://localhost:3000
- Check API endpoint: http://localhost:3000/api/v1/catalog/categories/all-with-images
- Check browser console for errors
- Hard refresh: `Ctrl + F5`

### Images Not Loading
- Check image URLs in network tab
- Verify MongoDB connection
- Check API logs for errors
- Verify image files exist in uploads folder

### Wrong Image Counts
- Verify MongoDB aggregation is working
- Check product_images collection
- Verify categoryId links are correct

## 🚀 Quick Test Script

Run this to test the API endpoint:
```bash
cd apps/api
ts-node -r tsconfig-paths/register src/database/test-categories-endpoint.ts
```

This will:
- ✅ Test the API endpoint
- ✅ Verify all 14 categories are returned
- ✅ Check image counts
- ✅ Verify sample images are included

