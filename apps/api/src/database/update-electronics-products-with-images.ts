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
const sourceFolder = 'C:\\Users\\bizzz\\Pictures\\Electornics';
const uploadDir = path.join(process.cwd(), 'uploads', 'products');
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = baseUrl;

// Electronics category ID
const ELECTRONICS_CATEGORY_ID = '7e46e126-9a92-42ce-86b5-6bc4a49c1e9f';

// Product information based on common electronics (will need manual verification)
const PRODUCT_INFO: Array<{
  imageFile: string;
  name: string;
  description: string;
  shortDescription: string;
  priceInRupees: number;
}> = [
  {
    imageFile: 'photo-1505740420928-5e560c06d30e.jpg',
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium wireless Bluetooth headphones with active noise cancellation, 30-hour battery life, and superior sound quality. Features comfortable over-ear design, quick charge capability, and multi-device connectivity.',
    shortDescription: 'Premium wireless headphones with noise cancellation and 30-hour battery life.',
    priceInRupees: 2999,
  },
  {
    imageFile: 'photo-1523275335684-37898b6baf30.jpg',
    name: 'Smart Fitness Watch',
    description: 'Advanced smart fitness watch with heart rate monitoring, GPS tracking, sleep analysis, and 50+ sports modes. Features AMOLED display, 7-day battery life, water resistance, and smartphone notifications.',
    shortDescription: 'Smart fitness watch with heart rate monitoring and GPS tracking.',
    priceInRupees: 4999,
  },
  {
    imageFile: 'photo-1527814050087-3793815479db.jpg',
    name: 'Portable Bluetooth Speaker',
    description: 'High-quality portable Bluetooth speaker with 360-degree sound, 20-hour battery life, and IPX7 waterproof rating. Features bass boost technology, hands-free calling, and wireless stereo pairing.',
    shortDescription: 'Portable Bluetooth speaker with 360-degree sound and waterproof design.',
    priceInRupees: 2499,
  },
  {
    imageFile: 'photo-1543068755-df93a9dd63b4.jpg',
    name: 'USB-C Fast Charging Cable',
    description: 'Premium USB-C to USB-C fast charging cable with data transfer speeds up to 480Mbps. Features braided nylon design, 6ft length, and supports up to 100W power delivery. Compatible with all USB-C devices.',
    shortDescription: 'Fast charging USB-C cable with braided design and 100W power delivery.',
    priceInRupees: 499,
  },
  {
    imageFile: 'photo-1585314614250-d213876625e1.jpg',
    name: 'Wireless Ergonomic Mouse',
    description: 'Ergonomic wireless mouse with 2.4GHz wireless connectivity and 12-month battery life. Features precision tracking, 6 programmable buttons, and comfortable grip design for extended use.',
    shortDescription: 'Ergonomic wireless mouse with precision tracking and long battery life.',
    priceInRupees: 1299,
  },
  {
    imageFile: 'photo-1606746448655-6d7d999ebf31.jpg',
    name: 'Mechanical Gaming Keyboard',
    description: 'RGB backlit mechanical gaming keyboard with Cherry MX switches, full anti-ghosting, and programmable keys. Features aluminum frame, detachable wrist rest, and customizable RGB lighting effects.',
    shortDescription: 'RGB mechanical gaming keyboard with Cherry MX switches and anti-ghosting.',
    priceInRupees: 5999,
  },
  {
    imageFile: 'photo-1697636979316-cc18d4369e66.lpg.avif',
    name: 'Adjustable Tablet Stand',
    description: 'Premium adjustable tablet stand with 360-degree rotation and height adjustment. Features aluminum construction, foldable design, and supports tablets up to 12.9 inches. Perfect for work and entertainment.',
    shortDescription: 'Adjustable aluminum tablet stand with 360-degree rotation.',
    priceInRupees: 899,
  },
  {
    imageFile: 'photo-1706166987740-02c6171a13fe.jpg',
    name: 'Protective Phone Case',
    description: 'Rugged protective phone case with shock-absorbing design and raised edges for screen protection. Features precise cutouts, wireless charging compatible, and available in multiple colors.',
    shortDescription: 'Rugged protective phone case with shock absorption and wireless charging support.',
    priceInRupees: 699,
  },
  {
    imageFile: 'photo-1763215878837-17659cc4683.jpg',
    name: 'High Capacity Power Bank',
    description: '20000mAh high-capacity power bank with fast charging support and dual USB outputs. Features LED indicator, compact design, and can charge smartphones multiple times. Includes USB-C and micro-USB inputs.',
    shortDescription: '20000mAh power bank with fast charging and dual USB outputs.',
    priceInRupees: 1999,
  },
  {
    imageFile: 'photo-1768839722882-d7300ee822bd.jpg',
    name: 'Ergonomic Laptop Stand',
    description: 'Adjustable aluminum laptop stand with ergonomic design and ventilation slots. Features height and angle adjustment, foldable design, and supports laptops up to 17 inches. Reduces neck and back strain.',
    shortDescription: 'Adjustable aluminum laptop stand with ergonomic design and ventilation.',
    priceInRupees: 1499,
  },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function updateProductsWithImages() {
  console.log('🚀 Starting product update and image migration to MongoDB...\n');
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');
    
    // Find the 10 products we just created
    const products = await db.collection('products').find({
      categoryId: ELECTRONICS_CATEGORY_ID,
      name: { $regex: /^(Wireless Headphones|Smart Watch|Bluetooth Speaker|USB-C Cable|Wireless Mouse|Mechanical Keyboard|Tablet Stand|Phone Case|Power Bank|Laptop Stand)/ }
    }).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log(`📦 Found ${products.length} products to update\n`);
    
    if (products.length === 0) {
      console.log('⚠️  No products found to update.\n');
      return;
    }
    
    let updatedCount = 0;
    let imageMigratedCount = 0;
    
    // Products are returned in reverse chronological order, so reverse to match
    const sortedProducts = products.reverse();
    
    for (let i = 0; i < sortedProducts.length; i++) {
      const product = sortedProducts[i];
      const productInfo = PRODUCT_INFO[i];
      
      if (!productInfo) {
        console.log(`⚠️  No product info found for product ${i + 1}, skipping...\n`);
        continue;
      }
      
      try {
        // Update product information
        const productSlug = generateSlug(productInfo.name);
        const priceInPaise = productInfo.priceInRupees * 100;
        
        await db.collection('products').updateOne(
          { id: product.id },
          {
            $set: {
              name: productInfo.name,
              slug: `${productSlug}-${Date.now()}`,
              description: productInfo.description,
              shortDescription: productInfo.shortDescription,
              updatedAt: new Date(),
            }
          }
        );
        
        console.log(`✅ [${i + 1}/${products.length}] Updated product: ${productInfo.name}`);
        
        // Update offer price
        await db.collection('offers').updateMany(
          { productId: product.id },
          {
            $set: {
              priceAmount: priceInPaise,
              priceCurrency: 'INR',
              updatedAt: new Date(),
            }
          }
        );
        console.log(`   ✅ Updated offer price: ₹${productInfo.priceInRupees}`);
        
        // Find and update the image
        const imageRecord = await db.collection('product_images').findOne({
          productId: product.id || product._id
        });
        
        if (imageRecord) {
          // Read the image file
          const imagePath = path.join(sourceFolder, productInfo.imageFile);
          
          try {
            const imageBuffer = await fs.readFile(imagePath);
            const fileExtension = path.extname(productInfo.imageFile).toLowerCase();
            const mimeType = 
              fileExtension === '.png' ? 'image/png' :
              fileExtension === '.webp' ? 'image/webp' :
              fileExtension === '.avif' ? 'image/avif' :
              'image/jpeg';
            
            // Update image record with binary data
            const mongoUrl = `${API_BASE_URL}/api/v1/images/${imageRecord.id}`;
            
            await db.collection('product_images').updateOne(
              { id: imageRecord.id },
              {
                $set: {
                  imageData: new mongoose.mongo.Binary(imageBuffer),
                  mimeType: mimeType,
                  url: mongoUrl,
                  altText: `${productInfo.name} - Image`,
                  updatedAt: new Date(),
                }
              }
            );
            
            console.log(`   ✅ Migrated image to MongoDB: ${productInfo.imageFile}`);
            imageMigratedCount++;
            
          } catch (imageError) {
            console.error(`   ⚠️  Could not read image file ${productInfo.imageFile}: ${imageError instanceof Error ? imageError.message : String(imageError)}`);
            // Still update the URL to MongoDB endpoint even if file read fails
            const mongoUrl = `${API_BASE_URL}/api/v1/images/${imageRecord.id}`;
            await db.collection('product_images').updateOne(
              { id: imageRecord.id },
              {
                $set: {
                  url: mongoUrl,
                  altText: `${productInfo.name} - Image`,
                  updatedAt: new Date(),
                }
              }
            );
          }
        }
        
        updatedCount++;
        console.log('');
        
      } catch (error) {
        console.error(`❌ [${i + 1}/${products.length}] Failed to update product ${product.id}: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Successfully updated: ${updatedCount} products`);
    console.log(`✅ Images migrated to MongoDB: ${imageMigratedCount}`);
    console.log('='.repeat(80));
    console.log('\n📋 Products are now updated with:');
    console.log('   - Proper product names and descriptions');
    console.log('   - Realistic prices in INR');
    console.log('   - Images stored in MongoDB (accessible via /api/v1/images/:imageId)');
    console.log('\n⚠️  NOTE: Please verify product details match the actual images.');
    console.log('   You can update names, descriptions, and prices through the vendor dashboard.\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

updateProductsWithImages().catch(console.error);

