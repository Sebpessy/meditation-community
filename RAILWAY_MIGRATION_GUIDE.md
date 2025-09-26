# Railway Migration Guide - Serene Space Meditation App

## Overview
Complete migration guide from Replit to Railway for your meditation application with 388+ users and 2,951+ meditation sessions.

## Current Application Analysis
- **Users**: 388 registered users
- **Sessions**: 2,951 meditation sessions  
- **Technology**: Node.js, React, PostgreSQL, Firebase Auth, WebSocket chat
- **Features**: Real-time chat, mood tracking, referral system, admin dashboard

## Railway Plan Recommendation
**Railway Pro ($20/month)** - Perfect for your needs:
- 32GB RAM, 32 vCPUs
- $20 included usage credit
- PostgreSQL database included
- Custom domains supported
- Suitable for production workloads

## Migration Steps

### 1. Create Railway Account & Project
1. Visit [railway.app](https://railway.app) and sign up
2. Create new project: "meditation-community"
3. Connect your GitHub account for deployment

### 2. Database Setup on Railway
1. Add PostgreSQL service to your Railway project
2. Note the connection details from Railway dashboard
3. Database will be automatically provisioned

### 3. Export Current Database
Your database export is already prepared. Save these SQL dumps:

**Users Table Export** (388 records):
```sql
-- Run this on your current Replit database
\copy users TO 'users_export.csv' WITH CSV HEADER;
\copy meditation_sessions TO 'sessions_export.csv' WITH CSV HEADER;
\copy referrals TO 'referrals_export.csv' WITH CSV HEADER;
\copy chat_messages TO 'chat_messages_export.csv' WITH CSV HEADER;
\copy meditation_templates TO 'templates_export.csv' WITH CSV HEADER;
\copy schedules TO 'schedules_export.csv' WITH CSV HEADER;
\copy mood_entries TO 'mood_entries_export.csv' WITH CSV HEADER;
\copy profile_pictures TO 'profile_pictures_export.csv' WITH CSV HEADER;
\copy banned_ips TO 'banned_ips_export.csv' WITH CSV HEADER;
\copy quantum_love_transactions TO 'transactions_export.csv' WITH CSV HEADER;
\copy message_likes TO 'message_likes_export.csv' WITH CSV HEADER;
```

### 4. Environment Variables for Railway
Configure these in Railway dashboard under Variables:

**Database:**
- `DATABASE_URL` - Will be auto-provided by Railway PostgreSQL

**Firebase (copy from current Replit):**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY` 
- `FIREBASE_CLIENT_EMAIL`

**Other:**
- `NODE_ENV=production`
- `PORT=5000` (Railway will override this)

### 5. Code Repository Setup
1. Create new GitHub repository: `meditation-community`
2. Clean up development files (remove .replit, add .gitignore)
3. Push your codebase to GitHub

**Update .gitignore:**
```
node_modules/
dist/
.env
.replit
*.log
.DS_Store
```

### 6. Deploy to Railway
1. In Railway dashboard, connect to your GitHub repo
2. Railway will auto-detect Node.js and use the prepared configs
3. Build process will run: `npm ci && npm run build`
4. Start command: `npm start`

### 7. Import Database Data
After Railway database is ready:
1. Connect to Railway PostgreSQL using provided credentials
2. Run schema creation: `npm run db:push` 
3. Import your CSV data using PostgreSQL COPY commands

### 8. Domain Configuration
**For custom domain (newself.me):**
1. In Railway project, go to Settings > Domains
2. Add custom domain: `newself.me`
3. Update DNS records to point to Railway:
   - Type: CNAME
   - Name: @ (or subdomain)  
   - Value: `your-app.up.railway.app`

### 9. Testing Checklist
- [ ] User login/registration with Firebase
- [ ] Meditation sessions playback
- [ ] Real-time chat functionality  
- [ ] Mood tracking and analytics
- [ ] Referral system working
- [ ] Admin dashboard accessible
- [ ] Profile picture uploads
- [ ] WebSocket connections stable

### 10. DNS Migration
**IMPORTANT**: Only change DNS after thorough testing
1. Test Railway deployment completely
2. Update DNS records to point to Railway
3. Monitor for 24 hours
4. Disable Replit deployment

## Migration Advantages
- **Reliability**: No more random crashes and downtime
- **Performance**: Better resources (32GB RAM vs limited Replit)  
- **Scaling**: Automatic scaling based on usage
- **Monitoring**: Built-in metrics and logging
- **Cost**: $20/month vs potential Replit upgrade costs

## Backup Strategy
- Keep Replit instance running until Railway is fully tested
- Export all database data before migration
- Test all critical user flows before DNS switch

## Support
- Railway documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: Active community support
- Railway status: [status.railway.app](https://status.railway.app)

Your meditation app will be much more stable and performant on Railway!