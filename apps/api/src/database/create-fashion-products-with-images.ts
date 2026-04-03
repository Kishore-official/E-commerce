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
const sourceFolder = 'C:\\Users\\bizzz\\Pictures\\Fashion';
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = baseUrl;

// Fashion category ID
const FASHION_CATEGORY_ID = '169a01d2-6a75-42b5-992c-edfbc9619690';

// Fashion product information based on image filenames and common fashion items
// Prices are in INR (will be converted to paise)
const FASHION_PRODUCTS: Array<{
  imageFile: string;
  name: string;
  description: string;
  shortDescription: string;
  priceInRupees: number;
}> = [
  {
    imageFile: 'mhl-chinos-bonobos-296-68e41c148d0ae.jpg',
    name: 'Classic Chinos Pants',
    description: 'Premium chinos pants with comfortable fit and modern style. Made from high-quality cotton blend fabric, perfect for casual and semi-formal occasions. Features classic straight-leg design, durable construction, and wrinkle-resistant material.',
    shortDescription: 'Classic chinos pants with comfortable fit and modern style.',
    priceInRupees: 2499,
  },
  {
    imageFile: 'photo-1483985988355-763728e1935b.jpg',
    name: 'Stylish Casual T-Shirt',
    description: 'Comfortable and stylish casual t-shirt made from premium cotton. Features modern fit, soft fabric, and versatile design perfect for everyday wear. Available in multiple colors with excellent durability and easy care.',
    shortDescription: 'Comfortable and stylish casual t-shirt made from premium cotton.',
    priceInRupees: 899,
  },
  {
    imageFile: 'photo-1508296695146-257a814070b4.jpg',
    name: 'Designer Denim Jacket',
    description: 'Classic denim jacket with modern design elements. Made from high-quality denim fabric with comfortable fit and durable construction. Features button closure, chest pockets, and timeless style that pairs well with any outfit.',
    shortDescription: 'Classic denim jacket with modern design and durable construction.',
    priceInRupees: 3499,
  },
  {
    imageFile: 'photo-1509631179647-0177331693ae.jpg',
    name: 'Elegant Blazer',
    description: 'Professional blazer with tailored fit and premium fabric. Perfect for business and formal occasions. Features structured shoulders, button closure, and refined silhouette. Made from high-quality wool blend for comfort and style.',
    shortDescription: 'Professional blazer with tailored fit and premium fabric.',
    priceInRupees: 4999,
  },
  {
    imageFile: 'photo-1558769132-cb1aea458c5e.jpg',
    name: 'Casual Hoodie',
    description: 'Comfortable and warm casual hoodie perfect for everyday wear. Made from soft cotton blend with fleece lining. Features adjustable hood, front pocket, and relaxed fit. Ideal for casual outings and comfortable lounging.',
    shortDescription: 'Comfortable and warm casual hoodie with fleece lining.',
    priceInRupees: 1999,
  },
  {
    imageFile: 'photo-1574201635302-388dd92a4c3f.jpg',
    name: 'Slim Fit Dress Shirt',
    description: 'Professional slim-fit dress shirt made from premium cotton. Features button-down collar, long sleeves, and tailored silhouette. Perfect for business and formal occasions. Wrinkle-resistant fabric for easy maintenance.',
    shortDescription: 'Professional slim-fit dress shirt made from premium cotton.',
    priceInRupees: 1799,
  },
  {
    imageFile: 'photo-1603189343302-e603f7add05a.jpg',
    name: 'Classic Polo Shirt',
    description: 'Versatile polo shirt with classic design and comfortable fit. Made from breathable pique cotton fabric. Features collar design, button placket, and short sleeves. Perfect for casual and semi-formal occasions.',
    shortDescription: 'Versatile polo shirt with classic design and comfortable fit.',
    priceInRupees: 1299,
  },
  {
    imageFile: 'photo-1608748010899-18f300247112.jpg',
    name: 'Fashionable Sweater',
    description: 'Stylish sweater with modern design and cozy feel. Made from premium wool blend fabric with soft texture. Features comfortable fit, ribbed cuffs and hem, and versatile style. Perfect for layering in cooler weather.',
    shortDescription: 'Stylish sweater with modern design and cozy feel.',
    priceInRupees: 2799,
  },
  {
    imageFile: 'photo-1724921196001-7258b18dc36a.jpg',
    name: 'Trendy Bomber Jacket',
    description: 'Modern bomber jacket with contemporary style and comfortable fit. Made from quality materials with ribbed cuffs and hem. Features zip closure, side pockets, and versatile design perfect for casual and streetwear styles.',
    shortDescription: 'Modern bomber jacket with contemporary style and comfortable fit.',
    priceInRupees: 3999,
  },
  {
    imageFile: 'premium_photo-1673627557215-1f9ad81b9004.jpg',
    name: 'Premium Leather Jacket',
    description: 'Luxury leather jacket with premium quality and timeless design. Made from genuine leather with excellent craftsmanship. Features classic biker style, zip closure, and durable construction. A statement piece for any wardrobe.',
    shortDescription: 'Luxury leather jacket with premium quality and timeless design.',
    priceInRupees: 8999,
  },
  {
    imageFile: 'premium_photo-1707932495000-5748b18dc36a.jpg',
    name: 'Designer Formal Suit',
    description: 'Elegant formal suit with tailored fit and premium fabric. Perfect for business meetings, weddings, and formal events. Features matching jacket and trousers, structured design, and professional appearance. Made from high-quality wool blend.',
    shortDescription: 'Elegant formal suit with tailored fit and premium fabric.',
    priceInRupees: 12999,
  },
  {
    imageFile: 'premium_photo-1729523163169-7b4c521615c8.jpg',
    name: 'Luxury Cashmere Coat',
    description: 'Premium cashmere coat with exceptional quality and elegant design. Made from finest cashmere wool for ultimate comfort and warmth. Features classic overcoat style, refined tailoring, and sophisticated appearance. Perfect for formal and special occasions.',
    shortDescription: 'Premium cashmere coat with exceptional quality and elegant design.',
    priceInRupees: 15999,
  },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function createFashionProductsFromImages() {
  console.log('🚀 Starting fashion product creation from images...\n');
  
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
      const productInfo = FASHION_PRODUCTS.find(p => p.imageFile === imageFile) || {
        imageFile: imageFile,
        name: `Fashion Item ${i + 1}`,
        description: 'Premium fashion item with modern design and high-quality materials. Perfect for everyday wear and special occasions.',
        shortDescription: 'Premium fashion item with modern design.',
        priceInRupees: 1999,
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
          sku: `FASH-${Date.now()}-${i + 1}`,
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
      console.log('\n📋 Created Fashion Products Summary:');
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

createFashionProductsFromImages().catch(console.error);

