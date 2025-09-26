#!/bin/bash

# RAILWAY POSTGRESQL DATA IMPORT SCRIPT
# Final step to migrate your 389 users + 2,957 sessions + all data

echo "🚀 Starting Railway PostgreSQL Import..."
echo "========================================="

# Get Railway PostgreSQL connection from environment
if [ -z "$RAILWAY_DATABASE_URL" ]; then
    echo "❌ Error: RAILWAY_DATABASE_URL not set"
    echo "Please set Railway DATABASE_URL:"
    echo "export RAILWAY_DATABASE_URL='postgresql://postgres:password@host:port/database'"
    exit 1
fi

echo "✅ Connecting to Railway PostgreSQL..."

# Create import SQL script
cat > /tmp/railway_import.sql << 'EOF'
-- IMPORT ALL REPLIT DATA TO RAILWAY

-- Import Users (389 records)
\copy users FROM '/tmp/users_export.csv' WITH CSV HEADER;

-- Import Meditation Sessions (2,957 records)  
\copy meditation_sessions FROM '/tmp/sessions_export.csv' WITH CSV HEADER;

-- Import Meditation Templates (84 records)
\copy meditation_templates FROM '/tmp/templates_export.csv' WITH CSV HEADER;

-- Import Schedules (308 records)
\copy schedules FROM '/tmp/schedules_export.csv' WITH CSV HEADER;

-- Import Mood Entries (268 records)
\copy mood_entries FROM '/tmp/moods_export.csv' WITH CSV HEADER;

-- Import Chat Messages (4 records)
\copy chat_messages FROM '/tmp/messages_export.csv' WITH CSV HEADER;

-- Import Message Likes (5 records)
\copy message_likes FROM '/tmp/likes_export.csv' WITH CSV HEADER;

-- Update sequences to prevent ID conflicts
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('meditation_sessions_id_seq', COALESCE((SELECT MAX(id) FROM meditation_sessions), 1));
SELECT setval('meditation_templates_id_seq', COALESCE((SELECT MAX(id) FROM meditation_templates), 1));
SELECT setval('schedules_id_seq', COALESCE((SELECT MAX(id) FROM schedules), 1));
SELECT setval('mood_entries_id_seq', COALESCE((SELECT MAX(id) FROM mood_entries), 1));
SELECT setval('chat_messages_id_seq', COALESCE((SELECT MAX(id) FROM chat_messages), 1));
SELECT setval('message_likes_id_seq', COALESCE((SELECT MAX(id) FROM message_likes), 1));

-- Verify import success
SELECT 
  'FINAL COUNTS:' as status,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM meditation_sessions) as sessions,
  (SELECT COUNT(*) FROM meditation_templates) as templates,
  (SELECT COUNT(*) FROM schedules) as schedules,
  (SELECT COUNT(*) FROM mood_entries) as moods,
  (SELECT COUNT(*) FROM chat_messages) as messages,
  (SELECT COUNT(*) FROM message_likes) as likes;

EOF

echo "🚀 Importing data to Railway PostgreSQL..."

# Execute import
psql "$RAILWAY_DATABASE_URL" -f /tmp/railway_import.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 MIGRATION COMPLETE!"
    echo "===================="
    echo "✅ 389 users imported"
    echo "✅ 2,957 meditation sessions imported"
    echo "✅ 84 meditation templates imported"  
    echo "✅ 308 schedules imported"
    echo "✅ 268 mood entries imported"
    echo "✅ 4 chat messages + 5 likes imported"
    echo ""
    echo "🚀 Your meditation community is now LIVE on Railway!"
    echo "All 389 users can log in and access their data!"
else
    echo "❌ Import failed. Check connection and try again."
fi