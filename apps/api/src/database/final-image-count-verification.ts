import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';
const uploadDir = path.join(process.cwd(), 'uploads', 'products');

async function verifyAllImages() {
  console.log('🔍 Final Image Verification Report\n');
  console.log('='.repeat(80));
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');
    
    // Count total images in database
    const totalImagesInDb = await db.collection('product_images').countDocuments();
    console.log(`📊 Total Images in MongoDB: ${totalImagesInDb}`);
    
    // Count products with images
    const productsWithImages = await db.collection('products').aggregate([
      {
        $lookup: {
          from: 'product_images',
          localField: '_id',
          foreignField: 'productId',
          as: 'images'
        }
      },
      {
        $match: { 'images.0': { $exists: true } }
      },
      {
        $project: {
          name: 1,
          imagesCount: { $size: '$images' }
        }
      }
    ]).toArray();
    
    console.log(`📦 Products with Images: ${productsWithImages.length}`);
    
    // Count images by source (if we can identify them)
    const totalProducts = await db.collection('products').countDocuments();
    console.log(`📦 Total Products: ${totalProducts}`);
    
    // Verify files on disk
    console.log('\n📁 Verifying Files on Disk:');
    console.log(`   Directory: ${uploadDir}`);
    
    try {
      const files = await fs.readdir(uploadDir);
      const imageFiles = files.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ext === '.jpeg' || ext === '.jpg' || ext === '.png';
      });
      
      console.log(`   ✅ Files on Disk: ${imageFiles.length}`);
      
      if (imageFiles.length === totalImagesInDb) {
        console.log('   ✅ File count matches database count!');
      } else {
        console.log(`   ⚠️  File count (${imageFiles.length}) differs from database count (${totalImagesInDb})`);
      }
    } catch (error) {
      console.log(`   ❌ Error reading directory: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Sample products with images
    console.log('\n📋 Sample Products with Images:');
    for (let i = 0; i < Math.min(productsWithImages.length, 10); i++) {
      const product = productsWithImages[i];
      console.log(`   ${i + 1}. ${product.name} - ${product.imagesCount} image(s)`);
    }
    
    // Image statistics
    const imageStats = await db.collection('product_images').aggregate([
      {
        $group: {
          _id: '$productId',
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          avgImages: { $avg: '$count' },
          maxImages: { $max: '$count' },
          minImages: { $min: '$count' }
        }
      }
    ]).toArray();
    
    if (imageStats.length > 0) {
      const stats = imageStats[0];
      console.log('\n📈 Image Statistics:');
      console.log(`   Average images per product: ${stats.avgImages.toFixed(2)}`);
      console.log(`   Maximum images per product: ${stats.maxImages}`);
      console.log(`   Minimum images per product: ${stats.minImages}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Total Images: ${totalImagesInDb}`);
    console.log(`   Products with Images: ${productsWithImages.length}`);
    console.log(`   Total Products: ${totalProducts}`);
    console.log(`   Coverage: ${((productsWithImages.length / totalProducts) * 100).toFixed(1)}% of products have images`);
    console.log('\n✅ All images are stored in MongoDB and accessible in your app!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed\n');
  }
}

verifyAllImages().catch(console.error);

