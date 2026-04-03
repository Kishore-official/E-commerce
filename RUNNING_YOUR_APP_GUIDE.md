# Running Your E-Commerce App - Complete Guide

## ✅ YES - Your Command is Correct!

**Command:** `pnpm dev`  
**Path:** `D:\E-commerce`  
**What it does:** Runs ALL apps together using Turborepo

## What's Running

When you run `pnpm dev` from the root, it starts:

| App | Port | URL | Purpose |
|-----|------|-----|---------|
| **API Server** | 3000 | http://localhost:3000 | Backend API (NestJS) |
| **Storefront** | 3001 | http://localhost:3001 | Customer shopping site |
| **Vendor Portal** | 3002 | http://localhost:3002 | Vendor management |
| **Admin Panel** | 3003 | http://localhost:3003 | Admin dashboard |

## Current Status

✅ **All apps are starting correctly!**

From your terminal output:
- ✅ Admin panel starting on port 3003
- ✅ Vendor portal starting on port 3002
- ✅ Storefront starting on port 3001
- ✅ API server building (will start on port 3000)

## Wait for API to Finish Building

The API server shows:
```
Info  Webpack is building your sources...
```

**Wait for this message:**
```
Nest application successfully started
```

Once you see that, the API is ready and **all image fixes will be active!**

## How to Use Your App

### 1. **Customer Shopping (Storefront)**
- URL: http://localhost:3001
- Login: `customer1@ecommerce.local` / `Password123!`
- Browse products, add to cart, checkout

### 2. **Vendor Management**
- URL: http://localhost:3002
- Login: `vendor1@ecommerce.local` / `Password123!`
- Manage products, offers, orders

### 3. **Admin Dashboard**
- URL: http://localhost:3003
- Login: `admin@ecommerce.local` / `Password123!`
- Approve products, manage platform

### 4. **API (Backend)**
- URL: http://localhost:3000
- API Docs: http://localhost:3000/api (if Swagger enabled)
- REST API endpoints

## After API Finishes Building

1. **Hard refresh browser:** `Ctrl+F5`
2. **Go to:** http://localhost:3001/products/iphone-15-pro
3. **You should see:** All 304 images in scrollable thumbnail strip!

## Alternative: Run Individual Apps

If you only need one app:

### API Only:
```bash
cd D:\E-commerce\apps\api
pnpm dev
```

### Storefront Only:
```bash
cd D:\E-commerce\apps\storefront
pnpm dev
```

### All Apps (What you're doing):
```bash
cd D:\E-commerce
pnpm dev
```

## Stopping the Apps

Press `Ctrl+C` in the terminal to stop all apps.

## Summary

✅ **Your command is perfect for end-to-end development!**

- `pnpm dev` from root = All apps running together
- Perfect for full-stack development
- All apps hot-reload on code changes
- API image fix will be active once build completes

**Just wait for the API to finish building, then test!**

