#!/bin/bash
# Railway Database Update Script
# This updates Railway PostgreSQL with latest Replit data

set -e

echo "🔄 Railway Database Update"
echo "=========================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it first:"
    echo "   npm i -g @railway/cli"
    exit 1
fi

# Check if backup file exists
BACKUP_FILE="railway_db_update_20251003_162913.sql"
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "📊 Database Stats:"
echo "  - Total Users: 398"
echo "  - Total Sessions: 3,215"
echo "  - Backup Size: 58MB"
echo ""

echo "⚠️  WARNING: This will REPLACE all data in Railway PostgreSQL"
read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "🔗 Linking to Railway project..."
railway link

echo ""
echo "📤 Importing database..."
echo "This may take 2-3 minutes for 58MB..."

# Import to Railway PostgreSQL
railway run psql -f "$BACKUP_FILE"

echo ""
echo "✅ Database updated successfully!"
echo ""
echo "Next steps:"
echo "1. Go to Railway dashboard"
echo "2. Trigger a new deployment"
echo "3. Watch logs for success messages"
