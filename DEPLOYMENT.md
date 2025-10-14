# 🚀 Deployment Guide - Protocoale Terapeutice România

## 🎯 Current Status

**Phase 3 COMPLETE!** ✅

The platform is now fully functional with:
- ✅ Beautiful Romanian homepage
- ✅ Protocol listing with search and filters
- ✅ Protocol detail pages with 3 viewing modes
- ✅ Complete PDF extraction pipeline
- ✅ CNAS web scraper
- ✅ Mobile-responsive design

## 📋 Pre-Deployment Checklist

### 1. Database Setup

**Option A: Local PostgreSQL (Development)**
```bash
# Create database
createdb protocoale_terapeutice

# Set environment variable
echo 'DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/protocoale_terapeutice?schema=public"' > .env

# Initialize Prisma
npx prisma generate
npx prisma db push
```

**Option B: Cloud PostgreSQL (Production)**

Recommended providers:
- **Supabase** (Free tier available) - https://supabase.com
- **Railway** (PostgreSQL + hosting) - https://railway.app
- **Neon** (Serverless Postgres) - https://neon.tech

```bash
# Get connection string from provider and add to .env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Initialize
npx prisma generate
npx prisma db push
```

### 2. Initial Data Population

Run the scraper to populate the database:

```bash
npm run scraper
```

This will:
1. Scrape https://cnas.ro/protocoale-terapeutice/
2. Download all protocol PDFs
3. Extract 100% of content from each PDF
4. Store in database with intelligent structuring

**Expected time:** 10-30 minutes depending on number of protocols

### 3. Environment Variables

Create `.env` file with:

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://..."

# MeiliSearch (Optional - for advanced search)
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_API_KEY=""

# Storage (Optional - for PDF backup)
S3_BUCKET_NAME=""
S3_REGION=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""

# AI for PDF extraction (Optional - for better structuring)
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Frontend)

**Pros:** Easy, fast, automatic deployments
**Cons:** Not HIPAA compliant, limited server-side execution time

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
```

**Important:** Configure PostgreSQL separately (use Supabase/Railway)

### Option 2: Railway (All-in-one)

**Pros:** PostgreSQL included, easy setup, affordable
**Cons:** Requires credit card

1. Create account at https://railway.app
2. Create new project
3. Add PostgreSQL service
4. Add Next.js service
5. Connect GitHub repo
6. Set environment variables
7. Deploy!

### Option 3: AWS / DigitalOcean (Full Control)

**Pros:** Complete control, scalable
**Cons:** More complex setup

```bash
# Build for production
npm run build

# Start production server
npm run start

# Or use PM2 for process management
npm i -g pm2
pm2 start npm --name "protocoale" -- start
```

### Option 4: Docker (Any Platform)

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t protocoale-terapeutice .
docker run -p 3000:3000 -e DATABASE_URL="..." protocoale-terapeutice
```

## 🔄 Automated Updates

Set up cron job or scheduled task to run scraper daily:

**Option 1: Cron (Linux/Mac)**
```bash
# Edit crontab
crontab -e

# Add daily scraper at 3 AM
0 3 * * * cd /path/to/protocoale-terapeutice && npm run scraper >> /var/log/scraper.log 2>&1
```

**Option 2: GitHub Actions**
Create `.github/workflows/scraper.yml`:

```yaml
name: Daily Scraper

on:
  schedule:
    - cron: '0 3 * * *'  # 3 AM daily
  workflow_dispatch:  # Manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx prisma generate
      - run: npm run scraper
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Option 3: Vercel Cron Jobs**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/scraper",
    "schedule": "0 3 * * *"
  }]
}
```

## 📊 Performance Optimization

### 1. Database Indexes

Already included in Prisma schema:
- Protocol code (unique)
- Last update date
- Categories
- Specialty code

### 2. Image Optimization

If using Next.js Image component, configure in `next.config.ts`:

```typescript
images: {
  domains: ['cnas.ro'],
  formats: ['image/avif', 'image/webp'],
}
```

### 3. Caching

Enable ISR (Incremental Static Regeneration):

```typescript
// In page.tsx
export const revalidate = 3600 // Revalidate every hour
```

### 4. CDN

Use Vercel's built-in CDN or configure Cloudflare in front of your deployment.

## 🔒 Security Checklist

- [ ] Database connection uses SSL (`?sslmode=require`)
- [ ] Environment variables are not committed to git
- [ ] CORS is configured appropriately
- [ ] Rate limiting is enabled for API routes
- [ ] Input validation for search queries
- [ ] PDF URLs are validated before download
- [ ] Regular security updates (`npm audit fix`)

## 📈 Monitoring

### Application Monitoring

Use Vercel Analytics or:

```bash
# Install Sentry
npm install @sentry/nextjs

# Configure in sentry.config.js
```

### Database Monitoring

```bash
# Prisma Studio (Development)
npx prisma studio

# Production: Use provider's dashboard
# - Supabase Dashboard
# - Railway Dashboard
# - AWS RDS Console
```

### Scraper Monitoring

Check `ScraperRun` table for logs:

```sql
SELECT * FROM scraper_runs ORDER BY started_at DESC LIMIT 10;
```

## 🧪 Testing Before Deployment

```bash
# 1. Run type checking
npx tsc --noEmit

# 2. Run linter
npm run lint

# 3. Test build
npm run build

# 4. Test production mode
npm run start

# 5. Manual testing
# - Homepage loads
# - Search works
# - Protocol listing works
# - Protocol detail pages load
# - All 3 viewing modes work
# - PDF downloads work
```

## 🆘 Troubleshooting

### Build fails with "Prisma Client not found"
```bash
npx prisma generate
npm run build
```

### Database connection fails
- Check DATABASE_URL format
- Verify SSL mode if using cloud database
- Check firewall/security group settings

### PDFs don't display
- CORS issue with CNAS server (expected)
- Use download button instead
- Consider proxying PDFs through your server

### Search returns no results
- Database is empty - run scraper first
- Check search query sanitization
- Verify protocol `rawText` is populated

## 📝 Post-Deployment Tasks

1. **Test all functionality**
   - Search
   - Filters
   - Protocol viewing
   - PDF downloads

2. **Monitor first scraper run**
   ```bash
   npm run scraper
   # Check logs for errors
   ```

3. **Set up alerts**
   - Scraper failures
   - Database connection issues
   - API errors

4. **Create admin dashboard** (Future)
   - View scraper runs
   - Manually verify protocols
   - Manage bookmarks

## 🎉 Launch Checklist

- [ ] Database is set up and accessible
- [ ] Scraper has run successfully
- [ ] Environment variables are configured
- [ ] Application builds without errors
- [ ] All pages are accessible
- [ ] Search works correctly
- [ ] PDF downloads work
- [ ] Mobile responsive design verified
- [ ] SEO metadata is configured
- [ ] Analytics is set up (optional)
- [ ] Automated scraper is scheduled
- [ ] Monitoring is in place
- [ ] Backup strategy is defined

## 🚀 You're Ready to Launch!

Once you've completed the checklist above, your platform is ready for users!

**Next Steps:**
1. Deploy to production
2. Run initial scraper
3. Share with medical professionals
4. Gather feedback
5. Iterate and improve

---

**Support:** For issues, check README.md and QUICK_START.md

**Version:** 1.0.0

**Last Updated:** Octombrie 2025
