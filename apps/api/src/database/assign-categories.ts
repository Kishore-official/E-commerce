/**
 * Assign categories to products based on suggestions or manual mapping
 * 
 * Usage: 
 *   ts-node -r tsconfig-paths/register src/database/assign-categories.ts --dry-run
 *   ts-node -r tsconfig-paths/register src/database/assign-categories.ts --apply
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/E-commerce?appName=E-commerce';
const DB_NAME = process.env.MONGODB_DB_NAME || 'E-commerce';

const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--apply');

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

async function assignCategories() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    } else {
      console.log('⚠️  APPLY MODE - Changes will be saved to database\n');
    }

    // Find products without categories
    const uncategorizedProducts = await db.collection('products').find({
      $or: [
        { categoryId: null },
        { categoryId: '' },
        { categoryId: { $exists: false } }
      ]
    }).toArray();

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

    const categoryMap = new Map(categories.map(c => [c.name, c.id]));

    console.log(`Found ${uncategorizedProducts.length} products without categories\n`);

    // Generate suggestions
    const assignments: Array<{ productId: string; productName: string; categoryId: string; categoryName: string }> = [];
    const needsManualReview: Array<{ productId: string; productName: string }> = [];

    for (const product of uncategorizedProducts) {
      const suggestedCategory = suggestCategory(product.name, product.description);
      
      if (suggestedCategory && categoryMap.has(suggestedCategory)) {
        assignments.push({
          productId: product.id,
          productName: product.name,
          categoryId: categoryMap.get(suggestedCategory)!,
          categoryName: suggestedCategory
        });
      } else {
        needsManualReview.push({
          productId: product.id,
          productName: product.name
        });
      }
    }

    console.log(`✅ Auto-suggested categories for ${assignments.length} products`);
    console.log(`⚠️  ${needsManualReview.length} products need manual review\n`);

    if (assignments.length > 0) {
      console.log('Category Assignments to Apply:\n');
      console.log('Product Name                    | Category');
      console.log('────────────────────────────────┼─────────────────────');
      
      assignments.slice(0, 20).forEach(a => {
        const name = a.productName.substring(0, 31).padEnd(31);
        console.log(`${name} | ${a.categoryName}`);
      });

      if (assignments.length > 20) {
        console.log(`... and ${assignments.length - 20} more`);
      }

      if (!DRY_RUN) {
        // Apply assignments
        let updated = 0;
        for (const assignment of assignments) {
          const result = await db.collection('products').updateOne(
            { id: assignment.productId },
            { 
              $set: { 
                categoryId: assignment.categoryId,
                updatedAt: new Date()
              }
            }
          );
          if (result.modifiedCount > 0) {
            updated++;
          }
        }
        console.log(`\n✅ Updated ${updated} products with categories`);
      }
    }

    if (needsManualReview.length > 0) {
      console.log(`\n⚠️  Products needing manual review (${needsManualReview.length}):\n`);
      needsManualReview.slice(0, 10).forEach(p => {
        console.log(`  - ${p.productName} (ID: ${p.productId})`);
      });
      if (needsManualReview.length > 10) {
        console.log(`  ... and ${needsManualReview.length - 10} more`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Process complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

assignCategories();

