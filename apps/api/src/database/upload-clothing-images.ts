import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';
const sourceFolder = 'C:\\Users\\bizzz\\Pictures\\ECOMMERCE_PRODUCT_IMAGES\\check\\CLOTHING_ACCESSORIES_JEWELLERY';
const uploadDir = path.join(process.cwd(), 'uploads', 'products');
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function uploadClothingImages() {
  console.log('🚀 Starting clothing/accessories/jewellery image upload process...\n');
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');
    
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    console.log(`📁 Upload directory: ${uploadDir}\n`);
    
    // Get all images from source folder
    const imageFiles = await fs.readdir(sourceFolder);
    const jpegFiles = imageFiles.filter(f => f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.jpg'));
    
    console.log(`📸 Found ${jpegFiles.length} images to process\n`);
    
    if (jpegFiles.length === 0) {
      console.log('⚠️  No images found in the folder.\n');
      return;
    }
    
    // Get products from database that don't have images yet, or get all products
    const products = await db.collection('products').find({
      status: { $in: ['approved', 'pending_review'] }
    }).toArray();
    
    // Filter products that don't have images yet
    const productsWithoutImages: any[] = [];
    for (const product of products) {
      const existingImages = await db.collection('product_images').find({
        productId: product._id || product.id
      }).toArray();
      
      if (existingImages.length === 0) {
        productsWithoutImages.push(product);
      }
    }
    
    // If we have more images than products without images, use all products
    const targetProducts = jpegFiles.length <= productsWithoutImages.length 
      ? productsWithoutImages 
      : products;
    
    console.log(`📦 Found ${targetProducts.length} products available for images\n`);
    
    if (targetProducts.length === 0) {
      console.log('⚠️  No products found. Creating sample products...\n');
      // Create sample products if none exist
      const vendor = await db.collection('vendors').findOne({ status: 'approved' });
      if (!vendor) {
        throw new Error('No approved vendor found');
      }
      
      // Create products for each image
      for (let i = 0; i < Math.min(jpegFiles.length, 20); i++) {
        const imageFile = jpegFiles[i];
        const productNumber = imageFile.split('_')[0] || `CLOTHING-${i + 1}`;
        
        const product: any = {
          id: uuidv4(),
          vendorId: vendor._id || vendor.id,
          name: `Clothing/Accessories Product ${productNumber}`,
          slug: `clothing-product-${productNumber}-${Date.now()}`,
          description: `Premium clothing, accessories, or jewellery product ${productNumber}`,
          categoryId: null,
          brandId: null,
          status: 'approved',
          countryCode: 'SA',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await db.collection('products').insertOne(product);
        targetProducts.push(product);
      }
      console.log(`✅ Created ${targetProducts.length} sample products\n`);
    }
    
    // Process each image
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < jpegFiles.length && i < targetProducts.length; i++) {
      const imageFile = jpegFiles[i];
      const product = targetProducts[i];
      
      try {
        // Read image file
        const sourcePath = path.join(sourceFolder, imageFile);
        const imageBuffer = await fs.readFile(sourcePath);
        
        // Generate unique filename
        const fileExtension = path.extname(imageFile);
        const fileName = `${uuidv4()}${fileExtension}`;
        const destPath = path.join(uploadDir, fileName);
        
        // Copy image to uploads folder
        await fs.writeFile(destPath, imageBuffer);
        
        // Create URL
        const imageUrl = `${baseUrl}/uploads/products/${fileName}`;
        
        // Check if product already has a primary image
        const existingImages = await db.collection('product_images').find({
          productId: product._id || product.id
        }).toArray();
        
        const isPrimary = existingImages.length === 0;
        
        // Create product image record
        const imageId = uuidv4();
        const productImage: any = {
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
        
        console.log(`✅ [${i + 1}/${jpegFiles.length}] Uploaded: ${imageFile} → ${product.name}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ [${i + 1}/${jpegFiles.length}] Failed: ${imageFile} - ${error instanceof Error ? error.message : String(error)}`);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Successfully uploaded: ${successCount} images`);
    console.log(`❌ Failed: ${errorCount} images`);
    console.log('='.repeat(80));
    
    // Summary
    const totalImages = await db.collection('product_images').countDocuments();
    console.log(`\n📊 Total product images in database: ${totalImages}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

uploadClothingImages().catch(console.error);

