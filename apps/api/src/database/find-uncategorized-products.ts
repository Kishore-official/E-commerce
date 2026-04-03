/**
 * Find products without categories and suggest category assignments
 * 
 * Usage: ts-node -r tsconfig-paths/register src/database/find-uncategorized-products.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/E-commerce?appName=E-commerce';
const DB_NAME = process.env.MONGODB_DB_NAME || 'E-commerce';

// Category keyword mapping for auto-suggestion
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Electronics': ['phone', 'smartphone', 'tablet', 'laptop', 'computer', 'tv', 'television', 'camera', 'headphone', 'speaker', 'electronic', 'gadget', 'device'],
  'Fashion': ['shirt', 'dress', 'pants', 'jeans', 'jacket', 'coat', 'shoes', 'boots', 'sneakers', 'bag', 'purse', 'watch', 'jewelry', 'accessory'],
  'Beauty & Health': ['makeup', 'cosmetic', 'skincare', 'beauty', 'perfume', 'shampoo', 'soap', 'cream', 'lotion', 'vitamin', 'supplement', 'health'],
  'Home & Kitchen': ['kitchen', 'cookware', 'appliance', 'furniture', 'bed', 'chair', 'table', 'lamp', 'decor', 'home', 'household'],
  'Sports & Outdoor': ['sport', 'fitness', 'gym', 'outdoor', 'camping', 'hiking', 'bike', 'bicycle', 'exercise', 'yoga', 'running'],
  'Pet Supplies': ['pet', 'dog', 'cat', 'animal', 'food', 'toy', 'collar', 'leash', 'bed', 'cage'],
  'Baby Products': ['baby', 'infant', 'toddler', 'diaper', 'stroller', 'crib', 'bottle', 'pacifier', 'toy'],
  'Grocery': ['food', 'grocery', 'snack', 'beverage', 'drink', 'cereal', 'pasta', 'rice', 'oil'],
  'Hobby & Arts': ['art', 'craft', 'hobby', 'paint', 'brush', 'canvas', 'book', 'music', 'instrument'],
};

function suggestCategory(productName: string, description?: string): string | null {
  const searchText = `${productName} ${description || ''}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return category;
    }
  }
  
  return null;
}

async function findUncategorizedProducts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Find products without categories
    const uncategorizedProducts = await db.collection('products').find({
      $or: [
        { categoryId: null },
        { categoryId: '' },
        { categoryId: { $exists: false } }
      ]
    }).toArray();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  PRODUCTS WITHOUT CATEGORIES');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Total uncategorized products: ${uncategorizedProducts.length}\n`);

    if (uncategorizedProducts.length === 0) {
      console.log('✅ All products have categories assigned!\n');
      await mongoose.disconnect();
      return;
    }

    // Get all categories
    const categories = await db.collection('categories').find({
      parentId: null,
      isActive: true
    }).toArray();

    console.log('Available categories:');
    categories.forEach((cat, i) => {
      console.log(`  ${i + 1}. ${cat.name} (ID: ${cat.id})`);
    });
    console.log('\n');

    // Analyze and suggest categories
    console.log('Product Analysis with Category Suggestions:\n');
    console.log('ID                                    | Product Name                    | Suggested Category');
    console.log('──────────────────────────────────────┼─────────────────────────────────┼─────────────────────');

    const suggestions: Array<{ productId: string; productName: string; suggestedCategory: string; categoryId: string }> = [];

    for (const product of uncategorizedProducts.slice(0, 50)) { // Limit to first 50 for display
      const suggestedCategory = suggestCategory(product.name, product.description);
      const category = categories.find(c => c.name === suggestedCategory);
      
      const productId = product.id.substring(0, 36);
      const productName = (product.name || 'N/A').substring(0, 33).padEnd(33);
      const suggested = (suggestedCategory || 'MANUAL REVIEW').padEnd(19);
      
      console.log(`${productId} | ${productName} | ${suggested}`);

      if (category) {
        suggestions.push({
          productId: product.id,
          productName: product.name,
          suggestedCategory: category.name,
          categoryId: category.id
        });
      }
    }

    if (uncategorizedProducts.length > 50) {
      console.log(`\n... and ${uncategorizedProducts.length - 50} more products`);
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

    if (suggestions.length > 0) {
      console.log(`\n💡 Found ${suggestions.length} products with auto-suggested categories`);
      console.log('\nTo apply these suggestions, use the assign-categories script.\n');
    }

    await mongoose.disconnect();
    console.log('✅ Analysis complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findUncategorizedProducts();

