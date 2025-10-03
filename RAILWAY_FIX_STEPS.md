# Railway Deployment Fix - Step by Step

## The Problem
Railway was using OLD compiled code (dist/index.js from August) instead of your NEW fixes. I've deleted the old build and created a fresh one with Railway support.

## Your Database Status
- **398 users** (up from 389) 
- **3,215 sessions** (up from 2,957)
- **58MB backup created**: `railway_db_update_20251003_162913.sql`

---

## STEP 1: Push Code to Trigger Railway Rebuild

Your code now has Railway fixes, but Railway needs to rebuild with the new code:

```bash
# Add all changes (including deleted old dist/)
git add .

# Commit the Railway fixes
git commit -m "Fix Railway deployment: support PG* variables and remove old dist build"

# Push to your repository
git push
```

**Railway will auto-deploy** when it detects the push.

---

## STEP 2: Watch Railway Build Logs

1. Go to Railway Dashboard → Your Project
2. Click on the new deployment
3. Look for **Build Logs** - you should see:
   ```
   RUN npx vite build --config vite.config.production.ts && npx esbuild server/index.ts...
   ✓ built in XXs
   ```

4. Then check **Deploy Logs** for SUCCESS:
   ```
   🔍 Database connection check:
   ✅ Built connection string from PG* variables
     - Host: [something].railway.internal
     - Port: 5432
     - Database: railway
   ✅ Database connection pool created successfully
   serving on port 3000
   ```

---

## STEP 3: Update Railway Database

Once Railway is running (even with old data), update it with your latest 398 users:

### Option A: Using Railway CLI (Recommended)

```bash
# Install Railway CLI if needed
npm i -g @railway/cli

# Run the update script
./update_railway_db.sh
```

The script will:
- Link to your Railway project
- Import the 58MB database backup
- Update all 398 users, 3,215 sessions, referrals, etc.

### Option B: Manual Import

```bash
# Link to Railway project
railway link

# Import database backup
railway run psql -f railway_db_update_20251003_162913.sql
```

---

## STEP 4: Verify Railway Works

1. Visit your Railway URL (e.g., `meditation-community.up.railway.app`)
2. Test login with existing user
3. Check that all 398 users are visible (if you're admin)
4. Verify meditation sessions load correctly

---

## STEP 5: Stop Replit Charges

**ONLY after Railway is 100% working:**

1. Go to Replit → Your project
2. Click "Publishing" tool
3. Navigate to "Manage" tab  
4. Click **"Shut Down"** (NOT pause)
5. Confirm shutdown

This **stops all Replit hosting charges** immediately.

---

## What Changed in the Code

### server/db.ts
- Now detects Railway's `PG*` variables (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)
- Builds connection string automatically
- Falls back to `DATABASE_URL` for Replit compatibility

### server/index.ts
- Uses Railway's `PORT` environment variable
- Falls back to port 5000 for Replit

### Fresh Build
- Deleted old August dist/ files
- Built fresh with all Railway fixes included
- Railway will rebuild this on deployment

---

## Troubleshooting

### If Railway still shows "DATABASE_URL must be set"
- Check that PostgreSQL service is **linked** to your app in Railway
- Verify both services are in the **same project**
- Ensure build completed successfully (check Build Logs)

### If database import fails
- Check Railway CLI is authenticated: `railway whoami`
- Ensure you're linked to correct project: `railway status`
- Verify backup file exists: `ls -lh railway_db_update_*.sql`

---

## Summary

1. ✅ Code fixed to support Railway's PG* variables
2. ✅ Fresh build created (no more old August code)
3. ✅ Database exported (398 users, 3,215 sessions ready)
4. 📤 **YOU DO**: Push to GitHub → Railway rebuilds → Import database → Verify → Shut down Replit

**Ready to deploy!** 🚀
