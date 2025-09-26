-- REPLIT TO RAILWAY DATA MIGRATION SCRIPT
-- Generated on 2025-09-26

-- Export Users Data
-- Total users: 389
\copy users TO '/tmp/users_export.csv' WITH CSV HEADER;

-- Export Meditation Sessions
-- Total sessions: 2,957
\copy meditation_sessions TO '/tmp/sessions_export.csv' WITH CSV HEADER;

-- Export Chat Messages  
-- Total messages: 4
\copy chat_messages TO '/tmp/messages_export.csv' WITH CSV HEADER;

-- Export Schedules
-- Total schedules: 308
\copy schedules TO '/tmp/schedules_export.csv' WITH CSV HEADER;

-- Export other tables if they exist
\copy meditation_templates TO '/tmp/templates_export.csv' WITH CSV HEADER;
\copy message_likes TO '/tmp/likes_export.csv' WITH CSV HEADER;
\copy mood_entries TO '/tmp/moods_export.csv' WITH CSV HEADER;