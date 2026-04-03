/**
 * Seed script: Populates the database with demo data for all roles and entities.
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/database/seed.ts
 *
 * Demo Accounts (password for all: Password123!):
 *   super_admin  → superadmin@meridian.com
 *   admin        → admin@meridian.com
 *   moderator    → moderator@meridian.com
 *   ops          → ops@meridian.com
 *   vendor       → vendor1@meridian.com, vendor2@meridian.com
 *   vendor_staff → staff1@meridian.com
 *   customer     → customer1@meridian.com, customer2@meridian.com, customer3@meridian.com
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/E-commerce';
const DB_NAME = process.env.MONGODB_DB_NAME || 'E-commerce';

const PASSWORD = 'Password123!';
const BCRYPT_SALT_ROUNDS = 12;
const COUNTRY_CODE = 'IN';
const CURRENCY = 'INR';

const now = new Date();

// ─── ID generators ───────────────────────────────────────────────
const ids = {
  // Users
  superAdmin: uuidv4(),
  admin: uuidv4(),
  moderator: uuidv4(),
  ops: uuidv4(),
  vendor1User: uuidv4(),
  vendor2User: uuidv4(),
  staff1User: uuidv4(),
  customer1: uuidv4(),
  customer2: uuidv4(),
  customer3: uuidv4(),

  // Vendors
  vendor1: uuidv4(),
  vendor2: uuidv4(),

  // Vendor Staff
  vendorStaff1: uuidv4(),

  // Categories
  catElectronics: uuidv4(),
  catPhones: uuidv4(),
  catLaptops: uuidv4(),
  catFashion: uuidv4(),
  catMensWear: uuidv4(),
  catWomensWear: uuidv4(),
  catHome: uuidv4(),
  catKitchen: uuidv4(),
  catBeauty: uuidv4(),
  catBooks: uuidv4(),

  // Brands
  brandApple: uuidv4(),
  brandSamsung: uuidv4(),
  brandNike: uuidv4(),
  brandSony: uuidv4(),
  brandBosch: uuidv4(),
  brandLevi: uuidv4(),

  // Products
  prodIphone: uuidv4(),
  prodGalaxy: uuidv4(),
  prodMacbook: uuidv4(),
  prodNikeShoes: uuidv4(),
  prodLeviJeans: uuidv4(),
  prodSonyHeadphones: uuidv4(),
  prodBoschMixer: uuidv4(),
  prodSamsungTV: uuidv4(),

  // Variants
  varIphone128: uuidv4(),
  varIphone256: uuidv4(),
  varGalaxy128: uuidv4(),
  varGalaxy256: uuidv4(),
  varMacbookM3: uuidv4(),
  varMacbookM3Pro: uuidv4(),
  varNikeShoes9: uuidv4(),
  varNikeShoes10: uuidv4(),
  varLeviJeans32: uuidv4(),
  varLeviJeans34: uuidv4(),
  varSonyBlack: uuidv4(),
  varSonyWhite: uuidv4(),
  varBoschMixer750: uuidv4(),
  varSamsungTV55: uuidv4(),
  varSamsungTV65: uuidv4(),

  // Offers
  offerIphone128: uuidv4(),
  offerIphone256: uuidv4(),
  offerGalaxy128: uuidv4(),
  offerMacbookM3: uuidv4(),
  offerNikeShoes9: uuidv4(),
  offerLeviJeans32: uuidv4(),
  offerSonyBlack: uuidv4(),
  offerBoschMixer: uuidv4(),
  offerSamsungTV55: uuidv4(),
  offerSamsungTV65: uuidv4(),

  // Orders
  order1: uuidv4(),
  order2: uuidv4(),
  order3: uuidv4(),

  // Order items
  orderItem1a: uuidv4(),
  orderItem1b: uuidv4(),
  orderItem2a: uuidv4(),
  orderItem3a: uuidv4(),

  // Payments
  payment1: uuidv4(),
  payment2: uuidv4(),
  payment3: uuidv4(),

  // Shipments
  shipment1: uuidv4(),
  shipment2: uuidv4(),
  shipment3: uuidv4(),

  // Shipment items
  shipItem1a: uuidv4(),
  shipItem1b: uuidv4(),
  shipItem2a: uuidv4(),
  shipItem3a: uuidv4(),

  // Review eligibility
  eligibility1: uuidv4(),
  eligibility2: uuidv4(),

  // Reviews
  review1: uuidv4(),
  review2: uuidv4(),
};

// ─── Helpers ─────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function daysAgo(days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

// ─── Main seed function ──────────────────────────────────────────
async function seed() {
  console.log('🌱 Starting seed...\n');

  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_SALT_ROUNDS);
  console.log(`  Password hash generated (for: ${PASSWORD})`);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  console.log(`  Connected to MongoDB: ${DB_NAME}\n`);

  // ── 1. USERS ─────────────────────────────────────────────────
  console.log('👤 Seeding users...');
  const users = [
    {
      id: ids.superAdmin,
      email: 'superadmin@meridian.com',
      passwordHash,
      firstName: 'Arjun',
      lastName: 'Mehta',
      role: 'super_admin',
      emailVerified: true,
      isActive: true,
      lastLoginAt: daysAgo(1),
      createdAt: daysAgo(90),
      updatedAt: daysAgo(1),
    },
    {
      id: ids.admin,
      email: 'admin@meridian.com',
      passwordHash,
      firstName: 'Priya',
      lastName: 'Sharma',
      role: 'admin',
      emailVerified: true,
      isActive: true,
      lastLoginAt: daysAgo(1),
      createdAt: daysAgo(85),
      updatedAt: daysAgo(1),
    },
    {
      id: ids.moderator,
      email: 'moderator@meridian.com',
      passwordHash,
      firstName: 'Vikram',
      lastName: 'Patel',
      role: 'moderator',
      emailVerified: true,
      isActive: true,
      lastLoginAt: daysAgo(2),
      createdAt: daysAgo(80),
      updatedAt: daysAgo(2),
    },
    {
      id: ids.ops,
      email: 'ops@meridian.com',
      passwordHash,
      firstName: 'Anita',
      lastName: 'Reddy',
      role: 'ops',
      emailVerified: true,
      isActive: true,
      lastLoginAt: daysAgo(1),
      createdAt: daysAgo(80),
      updatedAt: daysAgo(1),
    },
    {
      id: ids.vendor1User,
      email: 'vendor1@meridian.com',
      passwordHash,
      firstName: 'Rajesh',
      lastName: 'Kumar',
      role: 'vendor',
      emailVerified: true,
      isActive: true,
      lastLoginAt: daysAgo(1),
      createdAt: daysAgo(60),
      updatedAt: daysAgo(1),
    },
    {
      id: ids.vendor2User,
      email: 'vendor2@meridian.com',
      passwordHash,
      firstName: 'Sneha',
      lastName: 'Gupta',
      role: 'vendor',
      emailVerified: true,
      isActive: true,
      lastLoginAt: daysAgo(3),
      createdAt: daysAgo(45),
      updatedAt: daysAgo(3),
    },
    {
      id: ids.staff1User,
      email: 'staff1@meridian.com',
      passwordHash,
      firstName: 'Amit',
      lastName: 'Singh',
      role: 'vendor_staff',
      emailVerified: true,
      isActive: true,
      lastLoginAt: daysAgo(2),
      createdAt: daysAgo(50),
      updatedAt: daysAgo(2),
    },
    {
      id: ids.customer1,
      email: 'customer1@meridian.com',
      passwordHash,
      firstName: 'Deepa',
      lastName: 'Nair',
      role: 'customer',
      emailVerified: true,
      isActive: true,
      lastLoginAt: daysAgo(1),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },
    {
      id: ids.customer2,
      email: 'customer2@meridian.com',
      passwordHash,
      firstName: 'Karthik',
      lastName: 'Iyer',
      role: 'customer',
      emailVerified: true,
      isActive: true,
      lastLoginAt: daysAgo(5),
      createdAt: daysAgo(25),
      updatedAt: daysAgo(5),
    },
    {
      id: ids.customer3,
      email: 'customer3@meridian.com',
      passwordHash,
      firstName: 'Meera',
      lastName: 'Joshi',
      role: 'customer',
      emailVerified: true,
      isActive: true,
      lastLoginAt: daysAgo(10),
      createdAt: daysAgo(20),
      updatedAt: daysAgo(10),
    },
  ];
  await db.collection('users').deleteMany({ email: { $regex: /@meridian\.com$/ } });
  await db.collection('users').insertMany(users);
  console.log(`  ✅ ${users.length} users created\n`);

  // ── 2. VENDORS ───────────────────────────────────────────────
  console.log('🏪 Seeding vendors...');
  const vendors = [
    {
      id: ids.vendor1,
      userId: ids.vendor1User,
      businessName: 'TechWorld Electronics',
      slug: 'techworld-electronics',
      businessEmail: 'business@techworld.in',
      phone: '+91-9876543210',
      description: 'Premium electronics and gadgets retailer since 2018',
      countryCode: COUNTRY_CODE,
      status: 'approved',
      commissionRate: 8.5,
      approvedAt: daysAgo(55),
      createdAt: daysAgo(60),
      updatedAt: daysAgo(55),
    },
    {
      id: ids.vendor2,
      userId: ids.vendor2User,
      businessName: 'FashionHub India',
      slug: 'fashionhub-india',
      businessEmail: 'business@fashionhub.in',
      phone: '+91-9876543211',
      description: 'Trendy fashion and lifestyle products for all ages',
      countryCode: COUNTRY_CODE,
      status: 'approved',
      commissionRate: 12.0,
      approvedAt: daysAgo(40),
      createdAt: daysAgo(45),
      updatedAt: daysAgo(40),
    },
  ];
  const vendorSlugs = vendors.map((v) => v.slug);
  await db.collection('vendors').deleteMany({ $or: [{ id: { $in: [ids.vendor1, ids.vendor2] } }, { slug: { $in: vendorSlugs } }] });
  await db.collection('vendors').insertMany(vendors);
  console.log(`  ✅ ${vendors.length} vendors created\n`);

  // ── 3. VENDOR STAFF ──────────────────────────────────────────
  console.log('👥 Seeding vendor staff...');
  const vendorStaff = [
    {
      id: ids.vendorStaff1,
      vendorId: ids.vendor1,
      userId: ids.staff1User,
      permissions: ['manage_products', 'manage_offers', 'view_orders'],
      createdAt: daysAgo(50),
      updatedAt: daysAgo(50),
    },
  ];
  await db.collection('vendor_staff').deleteMany({ id: ids.vendorStaff1 });
  await db.collection('vendor_staff').insertMany(vendorStaff);
  console.log(`  ✅ ${vendorStaff.length} vendor staff created\n`);

  // ── 4. CATEGORIES ────────────────────────────────────────────
  console.log('📂 Seeding categories...');
  const categories = [
    { id: ids.catElectronics, name: 'Electronics', slug: 'electronics', description: 'Gadgets, phones, laptops, and more', sortOrder: 1, isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.catPhones, parentId: ids.catElectronics, name: 'Smartphones', slug: 'smartphones', description: 'Latest smartphones and accessories', sortOrder: 1, isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.catLaptops, parentId: ids.catElectronics, name: 'Laptops', slug: 'laptops', description: 'Laptops and notebooks', sortOrder: 2, isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.catFashion, name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes, and accessories', sortOrder: 2, isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.catMensWear, parentId: ids.catFashion, name: "Men's Wear", slug: 'mens-wear', description: 'Fashion for men', sortOrder: 1, isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.catWomensWear, parentId: ids.catFashion, name: "Women's Wear", slug: 'womens-wear', description: 'Fashion for women', sortOrder: 2, isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.catHome, name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Home appliances and kitchen essentials', sortOrder: 3, isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.catKitchen, parentId: ids.catHome, name: 'Kitchen Appliances', slug: 'kitchen-appliances', description: 'Mixers, grinders, and more', sortOrder: 1, isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.catBeauty, name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Beauty products and personal care', sortOrder: 4, isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.catBooks, name: 'Books', slug: 'books', description: 'Fiction, non-fiction, and educational', sortOrder: 5, isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
  ];
  const catSlugs = categories.map((c) => c.slug);
  await db.collection('categories').deleteMany({ $or: [{ id: { $in: categories.map((c) => c.id) } }, { slug: { $in: catSlugs } }] });
  await db.collection('categories').insertMany(categories);
  console.log(`  ✅ ${categories.length} categories created (4 top-level, 6 sub-categories)\n`);

  // ── 5. BRANDS ────────────────────────────────────────────────
  console.log('🏷️  Seeding brands...');
  const brands = [
    { id: ids.brandApple, name: 'Apple', slug: 'apple', isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.brandSamsung, name: 'Samsung', slug: 'samsung', isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.brandNike, name: 'Nike', slug: 'nike', isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.brandSony, name: 'Sony', slug: 'sony', isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.brandBosch, name: 'Bosch', slug: 'bosch', isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
    { id: ids.brandLevi, name: "Levi's", slug: 'levis', isActive: true, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
  ];
  const brandSlugs = brands.map((b) => b.slug);
  await db.collection('brands').deleteMany({ $or: [{ id: { $in: brands.map((b) => b.id) } }, { slug: { $in: brandSlugs } }] });
  await db.collection('brands').insertMany(brands);
  console.log(`  ✅ ${brands.length} brands created\n`);

  // ── 6. PRODUCTS ──────────────────────────────────────────────
  console.log('📦 Seeding products...');
  const products = [
    // Vendor 1 — TechWorld Electronics
    {
      id: ids.prodIphone, vendorId: ids.vendor1, categoryId: ids.catPhones, brandId: ids.brandApple,
      name: 'iPhone 15 Pro', slug: 'iphone-15-pro', description: 'The latest iPhone with A17 Pro chip, titanium design, and 48MP camera system.',
      shortDescription: 'A17 Pro chip, titanium design', status: 'approved', countryOfOrigin: 'US',
      createdAt: daysAgo(50), updatedAt: daysAgo(45),
    },
    {
      id: ids.prodGalaxy, vendorId: ids.vendor1, categoryId: ids.catPhones, brandId: ids.brandSamsung,
      name: 'Samsung Galaxy S24 Ultra', slug: 'samsung-galaxy-s24-ultra', description: 'Galaxy AI powered smartphone with S Pen, 200MP camera, and Snapdragon 8 Gen 3.',
      shortDescription: 'Galaxy AI, 200MP camera, S Pen', status: 'approved', countryOfOrigin: 'KR',
      createdAt: daysAgo(48), updatedAt: daysAgo(43),
    },
    {
      id: ids.prodMacbook, vendorId: ids.vendor1, categoryId: ids.catLaptops, brandId: ids.brandApple,
      name: 'MacBook Pro 14"', slug: 'macbook-pro-14', description: 'MacBook Pro with M3 chip, Liquid Retina XDR display, and up to 22 hours battery life.',
      shortDescription: 'M3 chip, Liquid Retina XDR', status: 'approved', countryOfOrigin: 'US',
      createdAt: daysAgo(47), updatedAt: daysAgo(42),
    },
    {
      id: ids.prodSonyHeadphones, vendorId: ids.vendor1, categoryId: ids.catElectronics, brandId: ids.brandSony,
      name: 'Sony WH-1000XM5', slug: 'sony-wh-1000xm5', description: 'Industry-leading noise cancelling headphones with exceptional sound quality.',
      shortDescription: 'Premium ANC headphones', status: 'approved', countryOfOrigin: 'JP',
      createdAt: daysAgo(46), updatedAt: daysAgo(41),
    },
    {
      id: ids.prodSamsungTV, vendorId: ids.vendor1, categoryId: ids.catElectronics, brandId: ids.brandSamsung,
      name: 'Samsung Crystal 4K Smart TV', slug: 'samsung-crystal-4k-tv', description: 'Stunning 4K resolution with Crystal Processor, Smart TV features, and Alexa built-in.',
      shortDescription: '4K Crystal Processor', status: 'approved', countryOfOrigin: 'KR',
      createdAt: daysAgo(44), updatedAt: daysAgo(40),
    },
    // Vendor 2 — FashionHub India
    {
      id: ids.prodNikeShoes, vendorId: ids.vendor2, categoryId: ids.catMensWear, brandId: ids.brandNike,
      name: 'Nike Air Max 270', slug: 'nike-air-max-270', description: 'Iconic Air Max with 270 degrees of visible Air cushioning for all-day comfort.',
      shortDescription: 'Max Air unit, all-day comfort', status: 'approved', countryOfOrigin: 'VN',
      createdAt: daysAgo(35), updatedAt: daysAgo(30),
    },
    {
      id: ids.prodLeviJeans, vendorId: ids.vendor2, categoryId: ids.catMensWear, brandId: ids.brandLevi,
      name: "Levi's 501 Original Jeans", slug: 'levis-501-original', description: "The iconic straight fit jean that started it all. Levi's 501 Original with signature button fly.",
      shortDescription: 'Iconic straight fit, button fly', status: 'approved', countryOfOrigin: 'IN',
      createdAt: daysAgo(34), updatedAt: daysAgo(29),
    },
    {
      id: ids.prodBoschMixer, vendorId: ids.vendor2, categoryId: ids.catKitchen, brandId: ids.brandBosch,
      name: 'Bosch TrueMixx Pro Mixer Grinder', slug: 'bosch-truemixx-pro', description: 'Powerful 750W mixer grinder with stone pounding technology for perfect grinding.',
      shortDescription: '750W, stone pounding tech', status: 'approved', countryOfOrigin: 'IN',
      createdAt: daysAgo(33), updatedAt: daysAgo(28),
    },
  ];
  const prodSlugs = products.map((p) => p.slug);
  await db.collection('products').deleteMany({ $or: [{ id: { $in: products.map((p) => p.id) } }, { slug: { $in: prodSlugs } }] });
  await db.collection('products').insertMany(products);
  console.log(`  ✅ ${products.length} products created\n`);

  // ── 7. VARIANTS ──────────────────────────────────────────────
  console.log('🔀 Seeding variants...');
  const variants = [
    { id: ids.varIphone128, productId: ids.prodIphone, sku: 'IPH15P-128-BLK', name: '128GB - Black Titanium', weightGrams: 187, isActive: true, sortOrder: 1, createdAt: daysAgo(50), updatedAt: daysAgo(45) },
    { id: ids.varIphone256, productId: ids.prodIphone, sku: 'IPH15P-256-BLU', name: '256GB - Blue Titanium', weightGrams: 187, isActive: true, sortOrder: 2, createdAt: daysAgo(50), updatedAt: daysAgo(45) },
    { id: ids.varGalaxy128, productId: ids.prodGalaxy, sku: 'GS24U-128-BLK', name: '128GB - Titanium Black', weightGrams: 232, isActive: true, sortOrder: 1, createdAt: daysAgo(48), updatedAt: daysAgo(43) },
    { id: ids.varGalaxy256, productId: ids.prodGalaxy, sku: 'GS24U-256-GRY', name: '256GB - Titanium Gray', weightGrams: 232, isActive: true, sortOrder: 2, createdAt: daysAgo(48), updatedAt: daysAgo(43) },
    { id: ids.varMacbookM3, productId: ids.prodMacbook, sku: 'MBP14-M3-512', name: 'M3 / 8GB / 512GB SSD', weightGrams: 1550, isActive: true, sortOrder: 1, createdAt: daysAgo(47), updatedAt: daysAgo(42) },
    { id: ids.varMacbookM3Pro, productId: ids.prodMacbook, sku: 'MBP14-M3PRO-1TB', name: 'M3 Pro / 18GB / 1TB SSD', weightGrams: 1610, isActive: true, sortOrder: 2, createdAt: daysAgo(47), updatedAt: daysAgo(42) },
    { id: ids.varNikeShoes9, productId: ids.prodNikeShoes, sku: 'NAM270-9-BLK', name: 'Size 9 - Black/White', weightGrams: 350, isActive: true, sortOrder: 1, createdAt: daysAgo(35), updatedAt: daysAgo(30) },
    { id: ids.varNikeShoes10, productId: ids.prodNikeShoes, sku: 'NAM270-10-BLK', name: 'Size 10 - Black/White', weightGrams: 370, isActive: true, sortOrder: 2, createdAt: daysAgo(35), updatedAt: daysAgo(30) },
    { id: ids.varLeviJeans32, productId: ids.prodLeviJeans, sku: 'LV501-32-IND', name: '32W x 32L - Indigo', weightGrams: 800, isActive: true, sortOrder: 1, createdAt: daysAgo(34), updatedAt: daysAgo(29) },
    { id: ids.varLeviJeans34, productId: ids.prodLeviJeans, sku: 'LV501-34-IND', name: '34W x 32L - Indigo', weightGrams: 820, isActive: true, sortOrder: 2, createdAt: daysAgo(34), updatedAt: daysAgo(29) },
    { id: ids.varSonyBlack, productId: ids.prodSonyHeadphones, sku: 'SNY-XM5-BLK', name: 'Black', weightGrams: 250, isActive: true, sortOrder: 1, createdAt: daysAgo(46), updatedAt: daysAgo(41) },
    { id: ids.varSonyWhite, productId: ids.prodSonyHeadphones, sku: 'SNY-XM5-WHT', name: 'Platinum Silver', weightGrams: 250, isActive: true, sortOrder: 2, createdAt: daysAgo(46), updatedAt: daysAgo(41) },
    { id: ids.varBoschMixer750, productId: ids.prodBoschMixer, sku: 'BSCH-TMP-750', name: '750W - 4 Jars', weightGrams: 4200, isActive: true, sortOrder: 1, createdAt: daysAgo(33), updatedAt: daysAgo(28) },
    { id: ids.varSamsungTV55, productId: ids.prodSamsungTV, sku: 'SMTV-CRY-55', name: '55 inch', weightGrams: 14500, isActive: true, sortOrder: 1, createdAt: daysAgo(44), updatedAt: daysAgo(40) },
    { id: ids.varSamsungTV65, productId: ids.prodSamsungTV, sku: 'SMTV-CRY-65', name: '65 inch', weightGrams: 19800, isActive: true, sortOrder: 2, createdAt: daysAgo(44), updatedAt: daysAgo(40) },
  ];
  const varSkus = variants.map((v) => v.sku);
  await db.collection('variants').deleteMany({ $or: [{ id: { $in: variants.map((v) => v.id) } }, { sku: { $in: varSkus } }] });
  await db.collection('variants').insertMany(variants);
  console.log(`  ✅ ${variants.length} variants created\n`);

  // ── 8. OFFERS (prices in paise — INR minor units) ────────────
  console.log('💰 Seeding offers...');
  const offers = [
    // Vendor 1 offers
    { id: ids.offerIphone128, productId: ids.prodIphone, variantId: ids.varIphone128, vendorId: ids.vendor1, offerType: 'marketplace', status: 'active', countryCode: COUNTRY_CODE, priceAmount: 12999900, priceCurrency: CURRENCY, compareAtPrice: 13499900, costPrice: 10500000, stockQuantity: 25, stockReserved: 2, fulfillmentType: 'vendor', isFeatured: true, createdAt: daysAgo(45), updatedAt: daysAgo(10) },
    { id: ids.offerIphone256, productId: ids.prodIphone, variantId: ids.varIphone256, vendorId: ids.vendor1, offerType: 'marketplace', status: 'active', countryCode: COUNTRY_CODE, priceAmount: 14999900, priceCurrency: CURRENCY, compareAtPrice: 15999900, costPrice: 12000000, stockQuantity: 15, stockReserved: 0, fulfillmentType: 'vendor', isFeatured: false, createdAt: daysAgo(45), updatedAt: daysAgo(10) },
    { id: ids.offerGalaxy128, productId: ids.prodGalaxy, variantId: ids.varGalaxy128, vendorId: ids.vendor1, offerType: 'marketplace', status: 'active', countryCode: COUNTRY_CODE, priceAmount: 12999900, priceCurrency: CURRENCY, compareAtPrice: 13999900, costPrice: 10000000, stockQuantity: 20, stockReserved: 1, fulfillmentType: 'vendor', isFeatured: true, createdAt: daysAgo(43), updatedAt: daysAgo(8) },
    { id: ids.offerMacbookM3, productId: ids.prodMacbook, variantId: ids.varMacbookM3, vendorId: ids.vendor1, offerType: 'marketplace', status: 'active', countryCode: COUNTRY_CODE, priceAmount: 17499900, priceCurrency: CURRENCY, compareAtPrice: 19999900, costPrice: 14500000, stockQuantity: 10, stockReserved: 0, fulfillmentType: 'vendor', isFeatured: true, createdAt: daysAgo(42), updatedAt: daysAgo(7) },
    { id: ids.offerSonyBlack, productId: ids.prodSonyHeadphones, variantId: ids.varSonyBlack, vendorId: ids.vendor1, offerType: 'marketplace', status: 'active', countryCode: COUNTRY_CODE, priceAmount: 2999900, priceCurrency: CURRENCY, compareAtPrice: 3499900, costPrice: 2200000, stockQuantity: 50, stockReserved: 3, fulfillmentType: 'vendor', isFeatured: false, createdAt: daysAgo(41), updatedAt: daysAgo(5) },
    { id: ids.offerSamsungTV55, productId: ids.prodSamsungTV, variantId: ids.varSamsungTV55, vendorId: ids.vendor1, offerType: 'marketplace', status: 'active', countryCode: COUNTRY_CODE, priceAmount: 4499900, priceCurrency: CURRENCY, compareAtPrice: 5499900, costPrice: 3500000, stockQuantity: 8, stockReserved: 0, fulfillmentType: 'vendor', isFeatured: false, createdAt: daysAgo(40), updatedAt: daysAgo(5) },
    { id: ids.offerSamsungTV65, productId: ids.prodSamsungTV, variantId: ids.varSamsungTV65, vendorId: ids.vendor1, offerType: 'marketplace', status: 'active', countryCode: COUNTRY_CODE, priceAmount: 6499900, priceCurrency: CURRENCY, compareAtPrice: 7999900, costPrice: 5000000, stockQuantity: 5, stockReserved: 0, fulfillmentType: 'vendor', isFeatured: false, createdAt: daysAgo(40), updatedAt: daysAgo(5) },
    // Vendor 2 offers
    { id: ids.offerNikeShoes9, productId: ids.prodNikeShoes, variantId: ids.varNikeShoes9, vendorId: ids.vendor2, offerType: 'marketplace', status: 'active', countryCode: COUNTRY_CODE, priceAmount: 1399900, priceCurrency: CURRENCY, compareAtPrice: 1599900, costPrice: 900000, stockQuantity: 30, stockReserved: 1, fulfillmentType: 'vendor', isFeatured: true, createdAt: daysAgo(30), updatedAt: daysAgo(5) },
    { id: ids.offerLeviJeans32, productId: ids.prodLeviJeans, variantId: ids.varLeviJeans32, vendorId: ids.vendor2, offerType: 'marketplace', status: 'active', countryCode: COUNTRY_CODE, priceAmount: 399900, priceCurrency: CURRENCY, compareAtPrice: 499900, costPrice: 250000, stockQuantity: 40, stockReserved: 0, fulfillmentType: 'vendor', isFeatured: false, createdAt: daysAgo(29), updatedAt: daysAgo(5) },
    { id: ids.offerBoschMixer, productId: ids.prodBoschMixer, variantId: ids.varBoschMixer750, vendorId: ids.vendor2, offerType: 'marketplace', status: 'active', countryCode: COUNTRY_CODE, priceAmount: 599900, priceCurrency: CURRENCY, compareAtPrice: 749900, costPrice: 400000, stockQuantity: 15, stockReserved: 0, fulfillmentType: 'vendor', isFeatured: false, createdAt: daysAgo(28), updatedAt: daysAgo(5) },
  ];
  const offerIds = offers.map((o) => o.id);
  await db.collection('offers').deleteMany({ id: { $in: offerIds } });
  await db.collection('offers').insertMany(offers);
  console.log(`  ✅ ${offers.length} offers created\n`);

  // ── 9. ORDERS ────────────────────────────────────────────────
  console.log('🛒 Seeding orders...');
  const shippingAddress1 = {
    name: 'Deepa Nair',
    line1: '42, MG Road, Indiranagar',
    city: 'Bangalore',
    state: 'Karnataka',
    postalCode: '560038',
    countryCode: COUNTRY_CODE,
    phone: '+91-9876500001',
  };
  const shippingAddress2 = {
    name: 'Karthik Iyer',
    line1: '15, Anna Salai',
    line2: 'Apt 4B',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postalCode: '600002',
    countryCode: COUNTRY_CODE,
    phone: '+91-9876500002',
  };
  const shippingAddress3 = {
    name: 'Meera Joshi',
    line1: '78, FC Road, Shivajinagar',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411005',
    countryCode: COUNTRY_CODE,
    phone: '+91-9876500003',
  };

  // Order 1: customer1 — delivered (iPhone + Sony headphones)
  // Order 2: customer2 — confirmed/processing (Nike shoes)
  // Order 3: customer3 — pending payment (Levi's jeans)
  const orders = [
    {
      id: ids.order1, orderNumber: 'MRD-2026-00001', userId: ids.customer1, countryCode: COUNTRY_CODE,
      status: 'delivered', subtotal: 15999800, shippingTotal: 0, taxTotal: 2879964, discountTotal: 0,
      grandTotal: 18879764, currency: CURRENCY, shippingAddress: shippingAddress1,
      idempotencyKey: uuidv4(), completedAt: daysAgo(5),
      createdAt: daysAgo(15), updatedAt: daysAgo(5),
    },
    {
      id: ids.order2, orderNumber: 'MRD-2026-00002', userId: ids.customer2, countryCode: COUNTRY_CODE,
      status: 'processing', subtotal: 1399900, shippingTotal: 9900, taxTotal: 251982, discountTotal: 0,
      grandTotal: 1661782, currency: CURRENCY, shippingAddress: shippingAddress2,
      idempotencyKey: uuidv4(),
      createdAt: daysAgo(5), updatedAt: daysAgo(3),
    },
    {
      id: ids.order3, orderNumber: 'MRD-2026-00003', userId: ids.customer3, countryCode: COUNTRY_CODE,
      status: 'pending_payment', subtotal: 399900, shippingTotal: 4900, taxTotal: 71982, discountTotal: 0,
      grandTotal: 476782, currency: CURRENCY, shippingAddress: shippingAddress3,
      idempotencyKey: uuidv4(),
      createdAt: daysAgo(1), updatedAt: daysAgo(1),
    },
  ];
  const orderIds = orders.map((o) => o.id);
  await db.collection('orders').deleteMany({ id: { $in: orderIds } });
  await db.collection('orders').insertMany(orders);
  console.log(`  ✅ ${orders.length} orders created\n`);

  // ── 10. ORDER ITEMS ──────────────────────────────────────────
  console.log('📋 Seeding order items...');
  const orderItems = [
    {
      id: ids.orderItem1a, orderId: ids.order1, offerId: ids.offerIphone128, vendorId: ids.vendor1,
      productName: 'iPhone 15 Pro', variantName: '128GB - Black Titanium', sku: 'IPH15P-128-BLK',
      quantity: 1, unitPrice: 12999900, totalPrice: 12999900, currency: CURRENCY,
      offerType: 'marketplace', status: 'delivered',
      createdAt: daysAgo(15), updatedAt: daysAgo(5),
    },
    {
      id: ids.orderItem1b, orderId: ids.order1, offerId: ids.offerSonyBlack, vendorId: ids.vendor1,
      productName: 'Sony WH-1000XM5', variantName: 'Black', sku: 'SNY-XM5-BLK',
      quantity: 1, unitPrice: 2999900, totalPrice: 2999900, currency: CURRENCY,
      offerType: 'marketplace', status: 'delivered',
      createdAt: daysAgo(15), updatedAt: daysAgo(5),
    },
    {
      id: ids.orderItem2a, orderId: ids.order2, offerId: ids.offerNikeShoes9, vendorId: ids.vendor2,
      productName: 'Nike Air Max 270', variantName: 'Size 9 - Black/White', sku: 'NAM270-9-BLK',
      quantity: 1, unitPrice: 1399900, totalPrice: 1399900, currency: CURRENCY,
      offerType: 'marketplace', status: 'confirmed',
      createdAt: daysAgo(5), updatedAt: daysAgo(3),
    },
    {
      id: ids.orderItem3a, orderId: ids.order3, offerId: ids.offerLeviJeans32, vendorId: ids.vendor2,
      productName: "Levi's 501 Original Jeans", variantName: '32W x 32L - Indigo', sku: 'LV501-32-IND',
      quantity: 1, unitPrice: 399900, totalPrice: 399900, currency: CURRENCY,
      offerType: 'marketplace', status: 'pending',
      createdAt: daysAgo(1), updatedAt: daysAgo(1),
    },
  ];
  const oiIds = orderItems.map((oi) => oi.id);
  await db.collection('order_items').deleteMany({ id: { $in: oiIds } });
  await db.collection('order_items').insertMany(orderItems);
  console.log(`  ✅ ${orderItems.length} order items created\n`);

  // ── 11. PAYMENTS ─────────────────────────────────────────────
  console.log('💳 Seeding payments...');
  const payments = [
    {
      id: ids.payment1, orderId: ids.order1, amount: 18879764, currency: CURRENCY,
      status: 'succeeded', gateway: 'mock_razorpay', gatewayPaymentId: 'pay_mock_001',
      paymentMethod: 'upi', idempotencyKey: uuidv4(), paidAt: daysAgo(15),
      createdAt: daysAgo(15), updatedAt: daysAgo(15),
    },
    {
      id: ids.payment2, orderId: ids.order2, amount: 1661782, currency: CURRENCY,
      status: 'succeeded', gateway: 'mock_razorpay', gatewayPaymentId: 'pay_mock_002',
      paymentMethod: 'card', idempotencyKey: uuidv4(), paidAt: daysAgo(5),
      createdAt: daysAgo(5), updatedAt: daysAgo(5),
    },
    {
      id: ids.payment3, orderId: ids.order3, amount: 476782, currency: CURRENCY,
      status: 'pending', gateway: 'mock_razorpay',
      idempotencyKey: uuidv4(),
      createdAt: daysAgo(1), updatedAt: daysAgo(1),
    },
  ];
  const payIds = payments.map((p) => p.id);
  await db.collection('payments').deleteMany({ id: { $in: payIds } });
  await db.collection('payments').insertMany(payments);
  console.log(`  ✅ ${payments.length} payments created\n`);

  // ── 12. SHIPMENTS ────────────────────────────────────────────
  console.log('🚚 Seeding shipments...');
  const shipments = [
    {
      id: ids.shipment1, orderId: ids.order1, vendorId: ids.vendor1,
      trackingNumber: 'DELHIVERY-TRK-001', carrier: 'Delhivery',
      status: 'delivered', estimatedDeliveryAt: daysAgo(6),
      shippedAt: daysAgo(12), deliveredAt: daysAgo(5),
      createdAt: daysAgo(14), updatedAt: daysAgo(5),
    },
    {
      id: ids.shipment2, orderId: ids.order2, vendorId: ids.vendor2,
      trackingNumber: 'BLUEDART-TRK-002', carrier: 'BlueDart',
      status: 'picking',
      createdAt: daysAgo(3), updatedAt: daysAgo(3),
    },
    {
      id: ids.shipment3, orderId: ids.order3, vendorId: ids.vendor2,
      status: 'pending',
      createdAt: daysAgo(1), updatedAt: daysAgo(1),
    },
  ];
  const shipIds = shipments.map((s) => s.id);
  await db.collection('shipments').deleteMany({ id: { $in: shipIds } });
  await db.collection('shipments').insertMany(shipments);
  console.log(`  ✅ ${shipments.length} shipments created\n`);

  // ── 13. SHIPMENT ITEMS ───────────────────────────────────────
  console.log('📦 Seeding shipment items...');
  const shipmentItems = [
    { id: ids.shipItem1a, shipmentId: ids.shipment1, orderItemId: ids.orderItem1a, quantity: 1, createdAt: daysAgo(14) },
    { id: ids.shipItem1b, shipmentId: ids.shipment1, orderItemId: ids.orderItem1b, quantity: 1, createdAt: daysAgo(14) },
    { id: ids.shipItem2a, shipmentId: ids.shipment2, orderItemId: ids.orderItem2a, quantity: 1, createdAt: daysAgo(3) },
    { id: ids.shipItem3a, shipmentId: ids.shipment3, orderItemId: ids.orderItem3a, quantity: 1, createdAt: daysAgo(1) },
  ];
  const siIds = shipmentItems.map((si) => si.id);
  await db.collection('shipment_items').deleteMany({ id: { $in: siIds } });
  await db.collection('shipment_items').insertMany(shipmentItems);
  console.log(`  ✅ ${shipmentItems.length} shipment items created\n`);

  // ── 14. REVIEW ELIGIBILITY ───────────────────────────────────
  console.log('✍️  Seeding review eligibility...');
  const reviewEligibility = [
    {
      id: ids.eligibility1, orderId: ids.order1, orderItemId: ids.orderItem1a,
      userId: ids.customer1, productId: ids.prodIphone, variantId: ids.varIphone128,
      status: 'review_submitted', eligibleUntil: daysFromNow(75),
      idempotencyKey: `elig-${ids.orderItem1a}`,
      createdAt: daysAgo(5), updatedAt: daysAgo(3),
    },
    {
      id: ids.eligibility2, orderId: ids.order1, orderItemId: ids.orderItem1b,
      userId: ids.customer1, productId: ids.prodSonyHeadphones, variantId: ids.varSonyBlack,
      status: 'eligible', eligibleUntil: daysFromNow(85),
      idempotencyKey: `elig-${ids.orderItem1b}`,
      createdAt: daysAgo(5), updatedAt: daysAgo(5),
    },
  ];
  const eligIds = reviewEligibility.map((re) => re.id);
  await db.collection('review_eligibility').deleteMany({ id: { $in: eligIds } });
  await db.collection('review_eligibility').insertMany(reviewEligibility);
  console.log(`  ✅ ${reviewEligibility.length} review eligibilities created\n`);

  // ── 15. REVIEWS ──────────────────────────────────────────────
  console.log('⭐ Seeding reviews...');
  const reviews = [
    {
      id: ids.review1, reviewEligibilityId: ids.eligibility1,
      userId: ids.customer1, productId: ids.prodIphone, variantId: ids.varIphone128,
      rating: 5, title: 'Best phone I have ever used!',
      body: 'The iPhone 15 Pro is incredible. The camera quality is unmatched, and the titanium build feels premium. Battery life easily lasts a full day with heavy use. Highly recommend!',
      status: 'approved', moderatedBy: ids.moderator, moderatedAt: daysAgo(2),
      idempotencyKey: `rev-${ids.eligibility1}`,
      createdAt: daysAgo(3), updatedAt: daysAgo(2),
    },
  ];
  const revIds = reviews.map((r) => r.id);
  await db.collection('reviews').deleteMany({ id: { $in: revIds } });
  await db.collection('reviews').insertMany(reviews);
  console.log(`  ✅ ${reviews.length} reviews created\n`);

  // ── SUMMARY ──────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 Seed completed successfully!\n');
  console.log('Demo accounts (password: Password123!):');
  console.log('  ┌──────────────┬──────────────────────────────┐');
  console.log('  │ Role         │ Email                        │');
  console.log('  ├──────────────┼──────────────────────────────┤');
  console.log('  │ super_admin  │ superadmin@meridian.com       │');
  console.log('  │ admin        │ admin@meridian.com            │');
  console.log('  │ moderator    │ moderator@meridian.com        │');
  console.log('  │ ops          │ ops@meridian.com              │');
  console.log('  │ vendor       │ vendor1@meridian.com          │');
  console.log('  │ vendor       │ vendor2@meridian.com          │');
  console.log('  │ vendor_staff │ staff1@meridian.com           │');
  console.log('  │ customer     │ customer1@meridian.com        │');
  console.log('  │ customer     │ customer2@meridian.com        │');
  console.log('  │ customer     │ customer3@meridian.com        │');
  console.log('  └──────────────┴──────────────────────────────┘');
  console.log('\nData summary:');
  console.log('  • 10 users (all 7 roles)');
  console.log('  • 2 vendors (TechWorld Electronics, FashionHub India)');
  console.log('  • 10 categories (5 top-level + 5 sub)');
  console.log('  • 6 brands (Apple, Samsung, Nike, Sony, Bosch, Levi\'s)');
  console.log('  • 8 products (5 electronics, 2 fashion, 1 kitchen)');
  console.log('  • 15 variants');
  console.log('  • 10 offers (all active, marketplace)');
  console.log('  • 3 orders (delivered, processing, pending_payment)');
  console.log('  • 4 order items');
  console.log('  • 3 payments (2 succeeded, 1 pending)');
  console.log('  • 3 shipments (delivered, picking, pending)');
  console.log('  • 2 review eligibilities');
  console.log('  • 1 approved review');

  await client.close();
  console.log('\n✅ Database connection closed.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
