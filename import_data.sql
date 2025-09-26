-- RAILWAY IMPORT SCRIPT
-- Import all exported data from Replit to Railway
-- Run this after uploading CSV files to Railway

-- Import Users (389 records)
\copy users FROM '/tmp/users_export.csv' WITH CSV HEADER;

-- Import Meditation Sessions (2,957 records)  
\copy meditation_sessions FROM '/tmp/sessions_export.csv' WITH CSV HEADER;

-- Import Chat Messages (4 records)
\copy chat_messages FROM '/tmp/messages_export.csv' WITH CSV HEADER;

-- Import Schedules (308 records)
\copy schedules FROM '/tmp/schedules_export.csv' WITH CSV HEADER;

-- Import Templates (if any)
\copy meditation_templates FROM '/tmp/templates_export.csv' WITH CSV HEADER;

-- Import Message Likes (if any)
\copy message_likes FROM '/tmp/likes_export.csv' WITH CSV HEADER;

-- Import Mood Entries (if any)
\copy mood_entries FROM '/tmp/moods_export.csv' WITH CSV HEADER;

-- Update sequences to prevent ID conflicts
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('meditation_sessions_id_seq', COALESCE((SELECT MAX(id) FROM meditation_sessions), 1));
SELECT setval('chat_messages_id_seq', COALESCE((SELECT MAX(id) FROM chat_messages), 1));
SELECT setval('schedules_id_seq', COALESCE((SELECT MAX(id) FROM schedules), 1));
SELECT setval('meditation_templates_id_seq', COALESCE((SELECT MAX(id) FROM meditation_templates), 1));
SELECT setval('message_likes_id_seq', COALESCE((SELECT MAX(id) FROM message_likes), 1));
SELECT setval('mood_entries_id_seq', COALESCE((SELECT MAX(id) FROM mood_entries), 1));