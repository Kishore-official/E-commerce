import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';
const sourceFolder = 'C:\\Users\\bizzz\\Pictures\\Electornics';
const uploadDir = path.join(process.cwd(), 'uploads', 'products');
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

// Electronics category ID (from previous query)
const ELECTRONICS_CATEGORY_ID = '7e46e126-9a92-42ce-86b5-6bc4a49c1e9f';

// Generic product names for electronics (will need manual update after image analysis)
const GENERIC_PRODUCT_NAMES = [
  'Wireless Headphones',
  'Smart Watch',
  'Bluetooth Speaker',
  'USB-C Cable',
  'Wireless Mouse',
  'Mechanical Keyboard',
  'Tablet Stand',
  'Phone Case',
  'Power Bank',
  'Laptop Stand',
];

// Generic descriptions
const GENERIC_DESCRIPTIONS = [
  'Premium quality electronics product with modern design and advanced features.',
  'High-performance electronic device designed for everyday use and reliability.',
  'Innovative electronics solution with cutting-edge technology and user-friendly interface.',
  'Durable and efficient electronic accessory for enhanced productivity.',
  'Sleek and modern electronics product with superior build quality.',
  'Advanced electronics device featuring the latest technology and premium materials.',
  'Professional-grade electronics accessory designed for optimal performance.',
  'Compact and portable electronics solution with excellent functionality.',
  'Premium electronics product with ergonomic design and advanced features.',
  'High-quality electronics device engineered for reliability and performance.',
];

// Price ranges in INR (in paise - minor currency units)
const PRICE_RANGES = [
  { min: 50000, max: 150000 },   // 500-1500 INR
  { min: 150000, max: 300000 },  // 1500-3000 INR
  { min: 300000, max: 500000 },  // 3000-5000 INR
  { min: 500000, max: 1000000 }, // 5000-10000 INR
  { min: 1000000, max: 2000000 }, // 10000-20000 INR
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getRandomPrice(): number {
  const range = PRICE_RANGES[Math.floor(Math.random() * PRICE_RANGES.length)];
  const price = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  return price;
}

async function createProductsFromImages() {
  console.log('🚀 Starting product creation from electronics images...\n');
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');
    
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    console.log(`📁 Upload directory: ${uploadDir}\n`);
    
    // Get approved vendor
    const vendor = await db.collection('vendors').findOne({ status: 'approved' });
    if (!vendor) {
      throw new Error('No approved vendor found. Please create an approved vendor first.');
    }
    const vendorId = vendor.id || vendor._id;
    console.log(`✅ Using vendor: ${vendor.businessName || vendorId}\n`);
    
    // Get all images from source folder
    const imageFiles = await fs.readdir(sourceFolder);
    const imageFilesFiltered = imageFiles.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ext === '.jpeg' || ext === '.jpg' || ext === '.png' || ext === '.avif';
    });
    
    console.log(`📸 Found ${imageFilesFiltered.length} images to process\n`);
    
    if (imageFilesFiltered.length === 0) {
      console.log('⚠️  No images found in the source folder.\n');
      return;
    }
    
    // Process each image
    let successCount = 0;
    let errorCount = 0;
    const createdProducts: Array<{ productId: string; name: string; imageFile: string }> = [];
    
    for (let i = 0; i < imageFilesFiltered.length; i++) {
      const imageFile = imageFilesFiltered[i];
      const productIndex = i % GENERIC_PRODUCT_NAMES.length;
      
      try {
        // Read image file
        const sourcePath = path.join(sourceFolder, imageFile);
        const imageBuffer = await fs.readFile(sourcePath);
        
        // Generate product name (using generic name - user should update after analyzing image)
        const productName = `${GENERIC_PRODUCT_NAMES[productIndex]} ${i + 1}`;
        const productSlug = `${generateSlug(productName)}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const productDescription = GENERIC_DESCRIPTIONS[productIndex];
        
        // Create product
        const productId = uuidv4();
        const product: any = {
          _id: productId,
          id: productId,
          vendorId: vendorId,
          categoryId: ELECTRONICS_CATEGORY_ID,
          brandId: null,
          name: productName,
          slug: productSlug,
          description: productDescription,
          shortDescription: productDescription.substring(0, 100),
          status: 'draft',
          countryOfOrigin: null,
          metaTitle: null,
          metaDescription: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await db.collection('products').insertOne(product);
        console.log(`✅ [${i + 1}/${imageFilesFiltered.length}] Created product: ${productName}`);
        
        // Create variant
        const variantId = uuidv4();
        const variant: any = {
          _id: variantId,
          id: variantId,
          productId: productId,
          sku: `ELEC-${Date.now()}-${i + 1}`,
          name: 'Standard',
          barcode: null,
          weightGrams: null,
          dimensionsCm: null,
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await db.collection('variants').insertOne(variant);
        console.log(`   ✅ Created variant: ${variant.sku}`);
        
        // Create offer (with random price in INR)
        const priceAmount = getRandomPrice();
        const offerId = uuidv4();
        const offer: any = {
          _id: offerId,
          id: offerId,
          productId: productId,
          variantId: variantId,
          vendorId: vendorId,
          offerType: 'marketplace',
          status: 'draft',
          countryCode: 'IN',
          priceAmount: priceAmount,
          priceCurrency: 'INR',
          compareAtPrice: null,
          costPrice: null,
          stockQuantity: Math.floor(Math.random() * 50) + 10, // 10-60 units
          stockReserved: 0,
          affiliateUrl: null,
          affiliateCommissionPct: null,
          fulfillmentType: 'vendor',
          isFeatured: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await db.collection('offers').insertOne(offer);
        const priceInRupees = (priceAmount / 100).toFixed(2);
        console.log(`   ✅ Created offer: ₹${priceInRupees} (${priceAmount} paise)`);
        
        // Copy image to uploads folder
        const fileExtension = path.extname(imageFile);
        const fileName = `${uuidv4()}${fileExtension}`;
        const destPath = path.join(uploadDir, fileName);
        await fs.writeFile(destPath, imageBuffer);
        
        // Create image URL
        const imageUrl = `${baseUrl}/uploads/products/${fileName}`;
        
        // Create product image record
        const imageId = uuidv4();
        const productImage: any = {
          _id: imageId,
          id: imageId,
          productId: productId,
          variantId: null,
          url: imageUrl,
          altText: `${productName} - Image`,
          sortOrder: 0,
          isPrimary: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await db.collection('product_images').insertOne(productImage);
        console.log(`   ✅ Uploaded image: ${imageFile}\n`);
        
        createdProducts.push({ productId, name: productName, imageFile });
        successCount++;
        
      } catch (error) {
        console.error(`❌ [${i + 1}/${imageFilesFiltered.length}] Failed: ${imageFile} - ${error instanceof Error ? error.message : String(error)}\n`);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Successfully created: ${successCount} products`);
    console.log(`❌ Failed: ${errorCount} products`);
    console.log('='.repeat(80));
    
    if (createdProducts.length > 0) {
      console.log('\n📋 Created Products Summary:');
      console.log('-'.repeat(80));
      createdProducts.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.name} (ID: ${p.productId})`);
        console.log(`   Image: ${p.imageFile}`);
      });
      console.log('-'.repeat(80));
      console.log('\n⚠️  NOTE: Products have generic names and descriptions.');
      console.log('   Please analyze each image and update the product details:');
      console.log('   - Product name (based on actual product in image)');
      console.log('   - Description (based on product features visible in image)');
      console.log('   - Price (update offer priceAmount if needed)');
      console.log('   - Submit products for review when ready\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

createProductsFromImages().catch(console.error);

