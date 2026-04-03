import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';
const uploadDir = path.join(process.cwd(), 'uploads', 'products');
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function verifyImages() {
  console.log('🔍 Verifying uploaded images...\n');
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');
    
    // Get all product images
    const images = await db.collection('product_images').find({}).toArray();
    console.log(`📸 Total product images in database: ${images.length}\n`);
    
    // Check recent beauty images (last 48)
    const recentImages = images.slice(-48);
    console.log(`🆕 Recent beauty images uploaded: ${recentImages.length}\n`);
    
    // Verify files exist on disk
    console.log('📁 Verifying files on disk:');
    console.log('─'.repeat(80));
    
    let filesExist = 0;
    let filesMissing = 0;
    
    for (const image of recentImages) {
      const url = image.url;
      // Extract filename from URL
      const fileName = url.split('/').pop();
      const filePath = path.join(uploadDir, fileName || '');
      
      try {
        await fs.access(filePath);
        filesExist++;
        if (filesExist <= 5) {
          console.log(`  ✅ ${fileName} - EXISTS`);
        }
      } catch {
        filesMissing++;
        if (filesMissing <= 5) {
          console.log(`  ❌ ${fileName} - MISSING`);
        }
      }
    }
    
    if (filesExist > 5) {
      console.log(`  ... and ${filesExist - 5} more files exist`);
    }
    if (filesMissing > 5) {
      console.log(`  ... and ${filesMissing - 5} more files missing`);
    }
    
    console.log(`\n✅ Files exist: ${filesExist}`);
    console.log(`❌ Files missing: ${filesMissing}\n`);
    
    // Check product associations
    console.log('🔗 Checking product associations:');
    console.log('─'.repeat(80));
    
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
        $match: {
          'images.0': { $exists: true }
        }
      },
      {
        $project: {
          name: 1,
          slug: 1,
          imageCount: { $size: '$images' }
        }
      }
    ]).toArray();
    
    console.log(`📦 Products with images: ${productsWithImages.length}`);
    
    // Show sample products with images
    console.log('\n📋 Sample products with images:');
    productsWithImages.slice(0, 10).forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - ${product.imageCount} image(s)`);
    });
    
    // Check image URLs format
    console.log('\n🌐 Image URL format check:');
    console.log('─'.repeat(80));
    const sampleImage = recentImages[0];
    if (sampleImage) {
      console.log(`  Sample URL: ${sampleImage.url}`);
      console.log(`  Expected format: ${baseUrl}/uploads/products/{filename}`);
      const isValid = sampleImage.url.startsWith(baseUrl) && sampleImage.url.includes('/uploads/products/');
      console.log(`  ✅ URL format: ${isValid ? 'VALID' : 'INVALID'}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log(`  Total images in DB: ${images.length}`);
    console.log(`  Recent beauty images: ${recentImages.length}`);
    console.log(`  Files on disk: ${filesExist}/${recentImages.length}`);
    console.log(`  Products with images: ${productsWithImages.length}`);
    console.log('='.repeat(80));
    
    console.log('\n💡 To test image access:');
    console.log(`  1. Start your API server: pnpm dev`);
    console.log(`  2. Visit: ${baseUrl}/uploads/products/{any-image-filename}.jpeg`);
    console.log(`  3. Or use API: GET ${baseUrl}/api/v1/public/products`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

verifyImages().catch(console.error);

