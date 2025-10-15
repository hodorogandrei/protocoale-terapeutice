# Production Deployment Guide

## Overview

The application is configured with **PM2** for production deployment, featuring:
- ✅ **Auto-restart** on crashes
- ✅ **Self-healing** with exponential backoff
- ✅ **Memory management** (auto-restart at 1GB)
- ✅ **Health monitoring** via `/api/health`
- ✅ **Graceful shutdown**
- ✅ **Daily cron restart** at 3 AM
- ✅ **Centralized logging**

## Quick Commands

### Starting the Application

```bash
# Build and start for the first time
npm run prod:deploy

# Or manually:
npm run build
npm run pm2:start
```

### Managing the Application

```bash
# Check status
npm run pm2:status

# View logs (real-time)
npm run pm2:logs

# Restart (zero-downtime reload)
npm run pm2:reload

# Stop application
npm run pm2:stop

# Delete from PM2
npm run pm2:delete

# Monitor resource usage
npm run pm2:monit
```

### Updating the Application

```bash
# After making changes (zero-downtime)
npm run prod:update

# This runs:
# 1. npm run build
# 2. npm run pm2:reload
```

## PM2 Configuration

The configuration is in `ecosystem.config.js`:

### Auto-Recovery Features

- **Auto-restart**: Automatically restarts on crashes
- **Max restarts**: 10 restarts within 10 seconds before giving up
- **Exponential backoff**: 100ms initial delay, increases on repeated failures
- **Memory limit**: Restarts if memory exceeds 1GB
- **Graceful shutdown**: Waits 5 seconds for clean shutdown

### Health Monitoring

Health check endpoint: `http://localhost:4444/api/health`

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-15T16:26:58.518Z",
  "uptime": 20.474040553,
  "checks": {
    "database": true,
    "responseTime": "57ms"
  },
  "memory": {
    "used": "59MB",
    "total": "63MB"
  }
}
```

### Scheduled Maintenance

- **Daily restart**: Automatically restarts at 3:00 AM (cron: `0 3 * * *`)
- Ensures fresh memory allocation
- Clears potential memory leaks

## Logging

Logs are stored in `logs/`:
- `logs/pm2-error.log` - Error logs
- `logs/pm2-out.log` - Standard output logs

View logs:
```bash
# Real-time logs
npm run pm2:logs

# Or directly with PM2
pm2 logs protocoale-terapeutice

# Last 100 lines
pm2 logs protocoale-terapeutice --lines 100

# Error logs only
pm2 logs protocoale-terapeutice --err

# Output logs only
pm2 logs protocoale-terapeutice --out
```

## Monitoring

### Real-time Monitoring

```bash
npm run pm2:monit
```

Shows:
- CPU usage
- Memory usage
- Number of restarts
- Uptime
- Process ID

### Process Information

```bash
pm2 show protocoale-terapeutice
```

Shows detailed information:
- Process status
- Environment variables
- Configuration
- Logs locations
- Resource usage

### Health Check Monitoring

Set up external monitoring (e.g., UptimeRobot, Pingdom) to check:
- URL: `http://162.55.247.245:4444/api/health`
- Expected: HTTP 200, `{"status":"healthy"}`
- Interval: Every 5 minutes

## Troubleshooting

### Application Won't Start

```bash
# Check logs
npm run pm2:logs

# Check if port is in use
lsof -i :4444

# Kill process on port 4444
fuser -k 4444/tcp

# Restart
npm run pm2:restart
```

### High Memory Usage

```bash
# Check current memory
pm2 show protocoale-terapeutice

# Force restart to clear memory
npm run pm2:restart

# Check for memory leaks in logs
tail -100 logs/pm2-error.log
```

### Application Keeps Restarting

```bash
# Check error logs
tail -50 logs/pm2-error.log

# Check restart count
pm2 list

# If over 10 restarts in short time, check:
# 1. Database connectivity
# 2. Environment variables
# 3. Port conflicts
```

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check health endpoint
curl http://localhost:4444/api/health

# If database is down, restart after fixing:
npm run pm2:restart
```

## Advanced Configuration

### Cluster Mode (Multiple Instances)

Edit `ecosystem.config.js`:
```javascript
instances: 'max', // Use all CPU cores
exec_mode: 'cluster'
```

Then:
```bash
npm run pm2:reload
```

### Custom Environment Variables

Edit `ecosystem.config.js`:
```javascript
env: {
  NODE_ENV: 'production',
  PORT: 4444,
  CUSTOM_VAR: 'value'
}
```

### Change Auto-Restart Schedule

Edit `ecosystem.config.js`:
```javascript
cron_restart: '0 3 * * *' // Daily at 3 AM
// Or:
cron_restart: '0 */6 * * *' // Every 6 hours
```

## PM2 Ecosystem Commands

### List All Applications

```bash
pm2 list
```

### Save Current Process List

```bash
pm2 save
```

This saves the process list so PM2 can resurrect it after server restart.

### Startup Script (Auto-start on Boot)

```bash
# Generate startup script
pm2 startup

# Save process list
pm2 save
```

This ensures the application starts automatically after server reboot.

### Update PM2

```bash
pm2 update
```

## Performance Optimization

### Enable Compression

The production build already includes:
- ✅ Minified JavaScript
- ✅ Optimized images
- ✅ Static page generation
- ✅ Automatic code splitting

### CDN Integration (Optional)

For serving static assets via CDN, update `next.config.js`:
```javascript
assetPrefix: 'https://cdn.example.com'
```

## Security Recommendations

1. **Environment Variables**: Store sensitive data in `.env` (already configured)
2. **Firewall**: Only expose port 4444 through reverse proxy
3. **HTTPS**: Use nginx/Apache with SSL certificate
4. **Rate Limiting**: Consider implementing rate limiting for API endpoints
5. **Regular Updates**: Keep dependencies updated with `npm audit fix`

## Backup Strategy

### Database Backups

```bash
# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Automated daily backup (add to cron)
0 2 * * * pg_dump $DATABASE_URL > /backups/protocoale-$(date +\%Y\%m\%d).sql
```

### Application Backups

```bash
# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# Backup uploaded data
tar -czf data-backup-$(date +%Y%m%d).tar.gz data/
```

## Support & Monitoring

### Check Application Health

```bash
curl http://localhost:4444/api/health
```

### Monitor PM2 Dashboard (Web UI)

```bash
# Install PM2 web dashboard (optional)
pm2 install pm2-server-monit
```

### External Monitoring Setup

Recommended monitoring services:
- **UptimeRobot**: Free, checks every 5 minutes
- **Pingdom**: Professional monitoring
- **New Relic**: Full APM solution
- **Datadog**: Infrastructure monitoring

---

## Current Status

✅ **Production server running on port 4444**
✅ **429 protocols loaded**
✅ **Health check: HEALTHY**
✅ **Auto-restart: ENABLED**
✅ **Daily maintenance: 3:00 AM**

Last updated: 2025-10-15
