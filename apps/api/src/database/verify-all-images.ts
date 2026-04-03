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
  console.log('🔍 Verifying ALL images in MongoDB and app...\n');
  console.log('='.repeat(80));
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');
    
    // Get all product images
    const allImages = await db.collection('product_images').find({}).toArray();
    const totalImages = allImages.length;
    
    console.log(`📸 Total images in MongoDB: ${totalImages}\n`);
    
    // Group by product
    const imagesByProduct = new Map<string, any[]>();
    allImages.forEach((img) => {
      const productId = img.productId || img._id;
      const list = imagesByProduct.get(productId) || [];
      list.push(img);
      imagesByProduct.set(productId, list);
    });
    
    console.log(`📦 Products with images: ${imagesByProduct.size}\n`);
    
    // Check files on disk
    console.log('📁 Verifying files on disk:');
    console.log('─'.repeat(80));
    
    let filesExist = 0;
    let filesMissing = 0;
    const missingFiles: string[] = [];
    
    for (const image of allImages) {
      const url = image.url || '';
      const fileName = url.split('/').pop() || '';
      const filePath = path.join(uploadDir, fileName);
      
      try {
        await fs.access(filePath);
        filesExist++;
      } catch {
        filesMissing++;
        if (filesMissing <= 10) {
          missingFiles.push(fileName);
        }
      }
    }
    
    console.log(`✅ Files exist: ${filesExist}/${totalImages}`);
    console.log(`❌ Files missing: ${filesMissing}/${totalImages}`);
    
    if (missingFiles.length > 0) {
      console.log('\n⚠️  Missing files (first 10):');
      missingFiles.forEach(f => console.log(`   - ${f}`));
    }
    
    // Check image URLs format
    console.log('\n🌐 Image URL format check:');
    console.log('─'.repeat(80));
    const sampleImages = allImages.slice(0, 5);
    let validUrls = 0;
    let invalidUrls = 0;
    
    sampleImages.forEach((img) => {
      const url = img.url || '';
      const isValid = url.startsWith('http://localhost:3000/uploads/products/') || 
                      url.startsWith('http://localhost:3000/api/v1/uploads/products/');
      if (isValid) {
        validUrls++;
      } else {
        invalidUrls++;
        if (invalidUrls <= 3) {
          console.log(`   ❌ Invalid URL format: ${url}`);
        }
      }
    });
    
    console.log(`\n✅ Valid URL format: ${validUrls}/${sampleImages.length} (sample)`);
    if (invalidUrls > 0) {
      console.log(`❌ Invalid URL format: ${invalidUrls}/${sampleImages.length} (sample)`);
    }
    
    // Products with multiple images
    const productsWithMultipleImages = Array.from(imagesByProduct.entries())
      .filter(([_, images]) => images.length > 1)
      .length;
    
    console.log(`\n📊 Products with multiple images: ${productsWithMultipleImages}`);
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log(`  Total images in MongoDB: ${totalImages}`);
    console.log(`  Products with images: ${imagesByProduct.size}`);
    console.log(`  Files on disk: ${filesExist}/${totalImages} (${((filesExist/totalImages)*100).toFixed(1)}%)`);
    console.log(`  Products with multiple images: ${productsWithMultipleImages}`);
    console.log('='.repeat(80));
    
    if (filesExist === totalImages && filesMissing === 0) {
      console.log('\n✅ ALL IMAGES ARE CORRECTLY SET UP!');
      console.log('   - All images are in MongoDB');
      console.log('   - All image files exist on disk');
      console.log('   - Images are linked to products');
      console.log('   - Ready to display in your app!');
    } else {
      console.log('\n⚠️  Some issues detected:');
      if (filesMissing > 0) {
        console.log(`   - ${filesMissing} image files are missing from disk`);
      }
    }
    
    console.log('\n💡 To test in your app:');
    console.log('   1. Visit: http://localhost:3001 (Storefront)');
    console.log('   2. Or: http://localhost:3002 (Vendor Portal)');
    console.log('   3. Or: http://localhost:3003 (Admin Panel)');
    console.log('   4. Check product listings - images should display');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

verifyAllImages().catch(console.error);

