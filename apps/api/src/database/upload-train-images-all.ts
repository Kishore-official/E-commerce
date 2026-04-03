import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';
const baseUploadDir = path.join(process.cwd(), 'uploads', 'products');
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

// All train folders to process
const trainFolders = [
  'C:\\Users\\bizzz\\Pictures\\ECOMMERCE_PRODUCT_IMAGES\\train\\BABY_PRODUCTS',
  'C:\\Users\\bizzz\\Pictures\\ECOMMERCE_PRODUCT_IMAGES\\train\\BEAUTY_HEALTH',
  'C:\\Users\\bizzz\\Pictures\\ECOMMERCE_PRODUCT_IMAGES\\train\\CLOTHING_ACCESSORIES_JEWELLERY',
  'C:\\Users\\bizzz\\Pictures\\ECOMMERCE_PRODUCT_IMAGES\\train\\ELECTRONICS',
  'C:\\Users\\bizzz\\Pictures\\ECOMMERCE_PRODUCT_IMAGES\\train\\GROCERY',
  'C:\\Users\\bizzz\\Pictures\\ECOMMERCE_PRODUCT_IMAGES\\train\\HOBBY_ARTS_STATIONERY',
  'C:\\Users\\bizzz\\Pictures\\ECOMMERCE_PRODUCT_IMAGES\\train\\HOME_KITCHEN_TOOLS',
  'C:\\Users\\bizzz\\Pictures\\ECOMMERCE_PRODUCT_IMAGES\\train\\PET_SUPPLIES',
  'C:\\Users\\bizzz\\Pictures\\ECOMMERCE_PRODUCT_IMAGES\\train\\SPORTS_OUTDOOR',
];

async function uploadTrainImages() {
  console.log('🚀 Starting train images upload process for all folders...\n');
  console.log(`📁 Processing ${trainFolders.length} folders\n`);
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');
    
    // Ensure upload directory exists
    await fs.mkdir(baseUploadDir, { recursive: true });
    console.log(`📁 Upload directory: ${baseUploadDir}\n`);
    
    // Get all products for image assignment
    const allProducts = await db.collection('products').find({
      status: { $in: ['approved', 'pending_review'] }
    }).toArray();
    
    console.log(`📦 Found ${allProducts.length} products in database\n`);
    
    if (allProducts.length === 0) {
      console.log('⚠️  No products found. Please create products first.\n');
      return;
    }
    
    let totalSuccessCount = 0;
    let totalErrorCount = 0;
    const folderStats: Array<{ folder: string; success: number; failed: number; total: number }> = [];
    
    // Process each folder
    for (const sourceFolder of trainFolders) {
      const folderName = path.basename(sourceFolder);
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📂 Processing folder: ${folderName}`);
      console.log('='.repeat(80) + '\n');
      
      let folderSuccessCount = 0;
      let folderErrorCount = 0;
      
      try {
        // Get all images from source folder
        const imageFiles = await fs.readdir(sourceFolder);
        const imageFilesFiltered = imageFiles.filter(f => {
          const ext = path.extname(f).toLowerCase();
          return ext === '.jpeg' || ext === '.jpg' || ext === '.png';
        });
        
        console.log(`📸 Found ${imageFilesFiltered.length} images in ${folderName}\n`);
        
        if (imageFilesFiltered.length === 0) {
          console.log(`⚠️  No images found in ${folderName}, skipping...\n`);
          folderStats.push({ folder: folderName, success: 0, failed: 0, total: 0 });
          continue;
        }
        
        // Process each image
        for (let i = 0; i < imageFilesFiltered.length; i++) {
          const imageFile = imageFilesFiltered[i];
          // Use round-robin to assign images to products
          const product = allProducts[i % allProducts.length];
          
          try {
            // Read image file
            const sourcePath = path.join(sourceFolder, imageFile);
            const imageBuffer = await fs.readFile(sourcePath);
            
            // Generate unique filename
            const fileExtension = path.extname(imageFile);
            const fileName = `${uuidv4()}${fileExtension}`;
            const destPath = path.join(baseUploadDir, fileName);
            
            // Copy image to uploads folder
            await fs.writeFile(destPath, imageBuffer);
            
            // Create URL
            const imageUrl = `${baseUrl}/uploads/products/${fileName}`;
            
            // Check if product already has a primary image
            const existingImages = await db.collection('product_images').find({
              productId: product._id || product.id
            }).toArray();
            
            const isPrimary = existingImages.length === 0;
            
            // If this is not the first image, unset primary flag from other images
            if (!isPrimary) {
              await db.collection('product_images').updateMany(
                { productId: product._id || product.id, isPrimary: true },
                { $set: { isPrimary: false } }
              );
            }
            
            // Create product image record
            const imageId = uuidv4();
            const productImage: any = {
              _id: imageId,
              id: imageId,
              productId: product._id || product.id,
              variantId: null,
              url: imageUrl,
              altText: `${product.name} - Image`,
              sortOrder: existingImages.length,
              isPrimary: isPrimary,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            await db.collection('product_images').insertOne(productImage);
            
            if ((i + 1) % 10 === 0 || i === imageFilesFiltered.length - 1) {
              console.log(`✅ [${i + 1}/${imageFilesFiltered.length}] Uploaded: ${imageFile} → ${product.name}`);
            }
            
            folderSuccessCount++;
            totalSuccessCount++;
            
          } catch (error) {
            console.error(`❌ [${i + 1}/${imageFilesFiltered.length}] Failed: ${imageFile} - ${error instanceof Error ? error.message : String(error)}`);
            folderErrorCount++;
            totalErrorCount++;
          }
        }
        
        console.log(`\n✅ ${folderName}: ${folderSuccessCount} uploaded, ${folderErrorCount} failed`);
        folderStats.push({ folder: folderName, success: folderSuccessCount, failed: folderErrorCount, total: imageFilesFiltered.length });
        
      } catch (error) {
        console.error(`❌ Error processing folder ${folderName}:`, error);
        folderStats.push({ folder: folderName, success: 0, failed: 0, total: 0 });
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ Total Successfully uploaded: ${totalSuccessCount} images`);
    console.log(`❌ Total Failed: ${totalErrorCount} images`);
    console.log(`\n📋 Per-folder breakdown:`);
    folderStats.forEach(stat => {
      console.log(`   ${stat.folder}: ${stat.success}/${stat.total} (${stat.failed} failed)`);
    });
    
    // Database summary
    const totalImages = await db.collection('product_images').countDocuments();
    console.log(`\n📊 Total product images in database: ${totalImages}`);
    
    const productsWithImageCount = await db.collection('products').aggregate([
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
    
    console.log(`📦 Products with images: ${productsWithImageCount.length}`);
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Connection closed\n');
  }
}

uploadTrainImages().catch(console.error);

