# How to Restart Your API Server

## Your Project Structure

This is a **monorepo** using:
- **Package Manager:** pnpm
- **Build Tool:** Turborepo
- **API Location:** `apps/api/`
- **Root Directory:** `D:\E-commerce`

## Option 1: Restart API Server Only (Recommended)

### Terminal Path:
```
D:\E-commerce\apps\api
```

### Command:
```bash
cd D:\E-commerce\apps\api
pnpm dev
```

**OR from root directory:**
```bash
cd D:\E-commerce
pnpm --filter @ecommerce/api dev
```

---

## Option 2: Run All Apps (API + Storefront + Admin + Vendor)

### Terminal Path:
```
D:\E-commerce
```

### Command:
```bash
cd D:\E-commerce
pnpm dev
```

This will start:
- API server (usually port 3000)
- Storefront (usually port 3001)
- Admin panel (usually port 3002)
- Vendor portal (usually port 3003)

---

## Step-by-Step Instructions

### To Restart API Server Only:

1. **Open a new terminal/command prompt**

2. **Navigate to API directory:**
   ```bash
   cd D:\E-commerce\apps\api
   ```

3. **If API is already running, stop it:**
   - Press `Ctrl+C` in the terminal where it's running
   - Wait for it to stop completely

4. **Start the API server:**
   ```bash
   pnpm dev
   ```

5. **Wait for it to start:**
   - You should see: "Nest application successfully started"
   - API will be running on: `http://localhost:3000`

6. **Verify it's working:**
   - Open browser: `http://localhost:3001/products/iphone-15-pro`
   - You should now see ALL 304 images (not just 3)

---

## Quick Commands Reference

| Task | Path | Command |
|------|------|---------|
| **Restart API only** | `D:\E-commerce\apps\api` | `pnpm dev` |
| **Restart API (from root)** | `D:\E-commerce` | `pnpm --filter @ecommerce/api dev` |
| **Run all apps** | `D:\E-commerce` | `pnpm dev` |
| **Build API** | `D:\E-commerce\apps\api` | `pnpm build` |
| **Stop server** | (any terminal) | Press `Ctrl+C` |

---

## What Happens After Restart

✅ API server loads the new code with image query fix
✅ Products will return ALL images from MongoDB
✅ Frontend will display all images in scrollable thumbnail strip
✅ Works like Amazon/Flipkart with all product images visible

---

## Troubleshooting

**If port 3000 is already in use:**
- Stop the existing process first
- Or change port in `apps/api/.env` file

**If you get "command not found":**
- Make sure you're using `pnpm` (not npm or yarn)
- Install pnpm: `npm install -g pnpm`

**If images still don't show:**
- Hard refresh browser: `Ctrl+F5`
- Clear browser cache
- Check API is running: `http://localhost:3000/api/v1/storefront/listings/iphone-15-pro`

---

**Recommended:** Use **Option 1** (API only) for faster restarts during development.

