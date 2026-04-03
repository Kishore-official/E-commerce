import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';
const sourceFolder = 'C:\\Users\\bizzz\\Pictures\\ECOMMERCE_PRODUCT_IMAGES\\check\\ELECTRONICS';
const uploadDir = path.join(process.cwd(), 'uploads', 'products');
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function uploadElectronicsImages() {
  console.log('🚀 Starting electronics image upload process...\n');
  
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
    const imageFilesFiltered = imageFiles.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ext === '.jpeg' || ext === '.jpg' || ext === '.png';
    });
    
    console.log(`📸 Found ${imageFilesFiltered.length} images to process\n`);
    
    if (imageFilesFiltered.length === 0) {
      console.log('⚠️  No images found in the source folder.\n');
      return;
    }
    
    // Get products from database that don't have images yet, or all products
    const productsWithImages = await db.collection('product_images').distinct('productId');
    
    const products = await db.collection('products').find({
      status: { $in: ['approved', 'pending_review'] },
      _id: { $nin: productsWithImages } // Products without images
    }).limit(imageFilesFiltered.length).toArray();
    
    // If we have more images than products without images, get all products
    let allProducts = products;
    if (imageFilesFiltered.length > products.length) {
      const additionalProducts = await db.collection('products').find({
        status: { $in: ['approved', 'pending_review'] }
      }).limit(imageFilesFiltered.length - products.length).toArray();
      allProducts = [...products, ...additionalProducts];
    }
    
    console.log(`📦 Found ${allProducts.length} products to assign images to\n`);
    
    if (allProducts.length === 0) {
      console.log('⚠️  No products found. Creating sample products...\n');
      // Create sample products if none exist
      const vendor = await db.collection('vendors').findOne({ status: 'approved' });
      if (!vendor) {
        throw new Error('No approved vendor found');
      }
      
      // Create products for each image
      for (let i = 0; i < Math.min(imageFilesFiltered.length, 10); i++) {
        const imageFile = imageFilesFiltered[i];
        const productNumber = i + 1;
        
        const productId = uuidv4();
        const product: any = {
          _id: productId,
          id: productId,
          vendorId: vendor._id || vendor.id,
          name: `Electronics Product ${productNumber}`,
          slug: `electronics-product-${productNumber}-${Date.now()}`,
          description: `Premium electronics product ${productNumber}`,
          categoryId: null,
          brandId: null,
          status: 'approved',
          countryCode: 'SA',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await db.collection('products').insertOne(product);
        allProducts.push(product);
      }
      console.log(`✅ Created ${allProducts.length} sample products\n`);
    }
    
    // Process each image
    let successCount = 0;
    let errorCount = 0;
    
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
        
        console.log(`✅ [${i + 1}/${imageFilesFiltered.length}] Uploaded: ${imageFile} → ${product.name}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ [${i + 1}/${imageFilesFiltered.length}] Failed: ${imageFile} - ${error instanceof Error ? error.message : String(error)}`);
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
    
    // Show products with images
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
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

uploadElectronicsImages().catch(console.error);

