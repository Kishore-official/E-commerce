/**
 * Analyze image distribution by category in MongoDB
 * 
 * Usage: ts-node -r tsconfig-paths/register src/database/analyze-image-categories.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/E-commerce?appName=E-commerce';
const DB_NAME = process.env.MONGODB_DB_NAME || 'E-commerce';

async function analyzeImageCategories() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Get image distribution by category
    const imageCategoryStats = await db.collection('product_images').aggregate([
      {
        $match: { productId: { $type: 'objectId' } }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: { path: '$product', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.categoryId',
          foreignField: 'id',
          as: 'category'
        }
      },
      {
        $unwind: { path: '$category', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: { $ifNull: ['$category.name', 'NO CATEGORY'] },
          totalImages: { $sum: 1 },
          categoryId: { $first: '$product.categoryId' },
          products: { $addToSet: '$product.id' }
        }
      },
      {
        $project: {
          _id: 0,
          categoryName: '$_id',
          categoryId: 1,
          totalImages: 1,
          productCount: { $size: '$products' }
        }
      },
      {
        $sort: { totalImages: -1 }
      }
    ]).toArray();

    // Get total count
    const totalImages = await db.collection('product_images').countDocuments();
    const totalProducts = await db.collection('products').countDocuments();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  MONGODB IMAGE DISTRIBUTION BY CATEGORY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Total Images: ${totalImages.toLocaleString()}`);
    console.log(`Total Products: ${totalProducts.toLocaleString()}\n`);

    console.log('Category Breakdown:\n');
    console.log('Rank | Category Name              | Images    | Products | Avg Images/Product');
    console.log('─────┼───────────────────────────┼───────────┼──────────┼──────────────────');

    imageCategoryStats.forEach((stat, index) => {
      const rank = (index + 1).toString().padStart(4);
      const categoryName = (stat.categoryName || 'NO CATEGORY').padEnd(27);
      const images = stat.totalImages.toLocaleString().padStart(9);
      const products = stat.productCount.toLocaleString().padStart(8);
      const avg = (stat.totalImages / stat.productCount).toFixed(1).padStart(16);
      console.log(`${rank} | ${categoryName} | ${images} | ${products} | ${avg}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════\n');

    // Find products without categories
    const productsWithoutCategory = await db.collection('products').countDocuments({
      $or: [
        { categoryId: null },
        { categoryId: '' },
        { categoryId: { $exists: false } }
      ]
    });

    if (productsWithoutCategory > 0) {
      console.log(`⚠️  Found ${productsWithoutCategory} products without categories\n`);
      
      // Sample products without categories
      const sampleProducts = await db.collection('products').find({
        $or: [
          { categoryId: null },
          { categoryId: '' },
          { categoryId: { $exists: false } }
        ]
      }).limit(10).toArray();

      console.log('Sample products without categories:');
      sampleProducts.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (ID: ${p.id})`);
      });
    } else {
      console.log('✅ All products have categories assigned\n');
    }

    await mongoose.disconnect();
    console.log('\n✅ Analysis complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

analyzeImageCategories();

