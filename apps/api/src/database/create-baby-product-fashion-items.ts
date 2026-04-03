import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';
const sourceFolder = 'C:\\Users\\bizzz\\Pictures\\baby & product';
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = baseUrl;

// Fashion category ID
const FASHION_CATEGORY_ID = '169a01d2-6a75-42b5-992c-edfbc9619690';

// Product information for baby & product items (fashion category)
// Prices are in INR (will be converted to paise)
const BABY_PRODUCT_ITEMS: Array<{
  imageFile: string;
  name: string;
  description: string;
  shortDescription: string;
  priceInRupees: number;
}> = [
  {
    imageFile: 'photo-1519689680058-324335c77eba.jpg',
    name: 'Stylish Baby Onesie Set',
    description: 'Adorable and comfortable baby onesie set with modern design. Made from soft, breathable cotton fabric that is gentle on baby\'s skin. Features snap closures for easy diaper changes, cute patterns, and comfortable fit. Perfect for everyday wear and special occasions.',
    shortDescription: 'Adorable and comfortable baby onesie set with modern design.',
    priceInRupees: 899,
  },
  {
    imageFile: 'photo-1621483942422-c2da7b656a82.jpg',
    name: 'Premium Baby Romper',
    description: 'High-quality baby romper with stylish design and comfortable fit. Made from premium organic cotton fabric, perfect for babies. Features easy snap closures, breathable material, and adorable patterns. Ideal for playtime, outings, and daily wear.',
    shortDescription: 'High-quality baby romper with stylish design and comfortable fit.',
    priceInRupees: 1199,
  },
  {
    imageFile: 'photo-1635258559918-ed56f88004de.jpg',
    name: 'Cute Baby Outfit Set',
    description: 'Charming baby outfit set with coordinated pieces. Made from soft, hypoallergenic fabric that is safe for sensitive skin. Features matching top and bottom, comfortable elastic waist, and cute designs. Perfect for photoshoots and special occasions.',
    shortDescription: 'Charming baby outfit set with coordinated pieces.',
    priceInRupees: 1499,
  },
  {
    imageFile: 'photo-1635874714425-c342060a4c58.jpg',
    name: 'Designer Baby Dress',
    description: 'Elegant baby dress with beautiful design and premium quality. Made from soft cotton blend fabric with delicate details. Features comfortable fit, easy care fabric, and timeless style. Perfect for parties, celebrations, and special events.',
    shortDescription: 'Elegant baby dress with beautiful design and premium quality.',
    priceInRupees: 1799,
  },
  {
    imageFile: 'photo-1716972065448-e08a46809530.jpg',
    name: 'Comfortable Baby Pajama Set',
    description: 'Cozy baby pajama set perfect for bedtime and lounging. Made from soft, stretchy fabric that allows for comfortable movement. Features snap closures, breathable material, and cute patterns. Ideal for a good night\'s sleep and relaxed days at home.',
    shortDescription: 'Cozy baby pajama set perfect for bedtime and lounging.',
    priceInRupees: 999,
  },
  {
    imageFile: 'photo-1724667593663-54c6bb73e7ce.jpg',
    name: 'Stylish Baby T-Shirt & Shorts Set',
    description: 'Modern baby t-shirt and shorts set with contemporary style. Made from premium cotton fabric that is gentle and breathable. Features comfortable fit, easy care, and versatile design. Perfect for everyday wear, playtime, and casual outings.',
    shortDescription: 'Modern baby t-shirt and shorts set with contemporary style.',
    priceInRupees: 1299,
  },
  {
    imageFile: 'photo-1738892248232-a5fd26a98ec4.jpg',
    name: 'Premium Baby Bodysuit',
    description: 'High-quality baby bodysuit with excellent craftsmanship. Made from organic cotton fabric that is safe and comfortable. Features snap closures, stretchy material, and adorable designs. Perfect for layering or wearing alone, ideal for all seasons.',
    shortDescription: 'High-quality baby bodysuit with excellent craftsmanship.',
    priceInRupees: 799,
  },
  {
    imageFile: 'photo-1761891953461-a33aa8c73593.jpg',
    name: 'Elegant Baby Formal Outfit',
    description: 'Sophisticated baby formal outfit perfect for special occasions. Made from premium fabric with attention to detail. Features elegant design, comfortable fit, and timeless style. Perfect for weddings, parties, photoshoots, and formal events.',
    shortDescription: 'Sophisticated baby formal outfit perfect for special occasions.',
    priceInRupees: 2499,
  },
  {
    imageFile: 'photo-1766918780914-e19d9de76d85.jpg',
    name: 'Cute Baby Jumpsuit',
    description: 'Adorable baby jumpsuit with playful design and comfortable fit. Made from soft, stretchy fabric that allows for easy movement. Features snap closures, breathable material, and cute patterns. Perfect for playtime, outings, and everyday adventures.',
    shortDescription: 'Adorable baby jumpsuit with playful design and comfortable fit.',
    priceInRupees: 1399,
  },
  {
    imageFile: 'photo-1772429378994-15c1e8568085.jpg',
    name: 'Stylish Baby Hoodie Set',
    description: 'Trendy baby hoodie set with modern design and cozy feel. Made from soft cotton blend fabric with fleece lining. Features adjustable hood, comfortable fit, and stylish patterns. Perfect for cooler weather, outdoor activities, and casual wear.',
    shortDescription: 'Trendy baby hoodie set with modern design and cozy feel.',
    priceInRupees: 1599,
  },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function createBabyProductFashionItems() {
  console.log('🚀 Starting baby product fashion items creation from images...\n');
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');
    
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
      return ext === '.jpeg' || ext === '.jpg' || ext === '.png' || ext === '.avif' || ext === '.webp';
    });
    
    console.log(`📸 Found ${imageFilesFiltered.length} images to process\n`);
    
    if (imageFilesFiltered.length === 0) {
      console.log('⚠️  No images found in the source folder.\n');
      return;
    }
    
    // Process each image
    let successCount = 0;
    let errorCount = 0;
    const createdProducts: Array<{ productId: string; name: string; imageFile: string; price: number }> = [];
    
    for (let i = 0; i < imageFilesFiltered.length; i++) {
      const imageFile = imageFilesFiltered[i];
      
      // Find matching product info or use generic
      const productInfo = BABY_PRODUCT_ITEMS.find(p => p.imageFile === imageFile) || {
        imageFile: imageFile,
        name: `Baby Fashion Item ${i + 1}`,
        description: 'Stylish baby fashion item with modern design and high-quality materials. Perfect for everyday wear and special occasions.',
        shortDescription: 'Stylish baby fashion item with modern design.',
        priceInRupees: 1299,
      };
      
      try {
        // Read image file
        const sourcePath = path.join(sourceFolder, imageFile);
        const imageBuffer = await fs.readFile(sourcePath);
        
        // Determine MIME type
        const fileExtension = path.extname(imageFile).toLowerCase();
        const mimeType = 
          fileExtension === '.png' ? 'image/png' :
          fileExtension === '.webp' ? 'image/webp' :
          fileExtension === '.avif' ? 'image/avif' :
          'image/jpeg';
        
        // Generate product slug
        const productSlug = `${generateSlug(productInfo.name)}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        
        // Create product
        const productId = uuidv4();
        const product: any = {
          _id: productId,
          id: productId,
          vendorId: vendorId,
          categoryId: FASHION_CATEGORY_ID,
          brandId: null,
          name: productInfo.name,
          slug: productSlug,
          description: productInfo.description,
          shortDescription: productInfo.shortDescription,
          status: 'draft', // Will need approval later
          countryOfOrigin: null,
          metaTitle: null,
          metaDescription: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await db.collection('products').insertOne(product);
        console.log(`✅ [${i + 1}/${imageFilesFiltered.length}] Created product: ${productInfo.name}`);
        
        // Create variant
        const variantId = uuidv4();
        const variant: any = {
          _id: variantId,
          id: variantId,
          productId: productId,
          sku: `BABY-FASH-${Date.now()}-${i + 1}`,
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
        
        // Create offer (price in paise)
        const priceAmount = productInfo.priceInRupees * 100; // Convert to paise
        const offerId = uuidv4();
        const offer: any = {
          _id: offerId,
          id: offerId,
          productId: productId,
          variantId: variantId,
          vendorId: vendorId,
          offerType: 'marketplace',
          status: 'draft', // Will need activation later
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
        console.log(`   ✅ Created offer: ₹${productInfo.priceInRupees.toFixed(2)} (${priceAmount} paise)`);
        
        // Create product image record with binary data stored in MongoDB
        const imageId = uuidv4();
        const mongoUrl = `${API_BASE_URL}/api/v1/images/${imageId}`;
        
        const productImage: any = {
          _id: imageId,
          id: imageId,
          productId: productId,
          variantId: null,
          url: mongoUrl,
          altText: `${productInfo.name} - Image`,
          sortOrder: 0,
          isPrimary: true,
          imageData: new mongoose.mongo.Binary(imageBuffer), // Store binary data directly
          mimeType: mimeType,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await db.collection('product_images').insertOne(productImage);
        console.log(`   ✅ Saved image to MongoDB: ${imageFile} (${(imageBuffer.length / 1024).toFixed(2)} KB)\n`);
        
        createdProducts.push({ 
          productId, 
          name: productInfo.name, 
          imageFile,
          price: productInfo.priceInRupees
        });
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
      console.log('\n📋 Created Baby Product Fashion Items Summary:');
      console.log('-'.repeat(80));
      createdProducts.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.name} - ₹${p.price.toFixed(2)}`);
        console.log(`   Product ID: ${p.productId}`);
        console.log(`   Image: ${p.imageFile}`);
        console.log('');
      });
      console.log('-'.repeat(80));
      console.log('\n✅ All images have been saved directly to MongoDB.');
      console.log('⚠️  NOTE: Products are in "draft" status.');
      console.log('   To make them visible in the storefront:');
      console.log('   1. Update product status to "approved"');
      console.log('   2. Update offer status to "active"\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

createBabyProductFashionItems().catch(console.error);

