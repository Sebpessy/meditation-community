-- Migrate users 409 & 410 from Replit to Railway
-- Run this in Railway PostgreSQL Query console

BEGIN;

-- User 409: Bille Biene
-- User 410: Lorena Lacerda

-- Note: Profile pictures are base64 encoded images (truncated here for readability)
-- You can get full images from Replit database if needed

INSERT INTO users (id, email, name, firebase_uid, profile_picture, is_admin, is_garden_angel, is_banned, banned_at, banned_reason, last_login_ip, profile_completed, referral_code, referred_by, quantum_love_points, created_at) 
VALUES 
(409, 'billebiene@googlemail.com', 'Bille Biene', 'UaEPbikTyTU3LRokuhwYJwGkK6j2', NULL, false, false, false, NULL, NULL, NULL, false, 'GQGU6YNC', NULL, 0, '2025-10-03 17:15:56.496996'),
(410, 'lorenaal@terra.com.br', 'Lorena Lacerda', 'JONM6uDJjTX4pgUq9Iwnb711nNq2', NULL, false, false, false, NULL, NULL, NULL, false, '7CJ2REYH', NULL, 0, '2025-10-03 22:23:11.575405')
ON CONFLICT (id) DO NOTHING;

-- Update sequence
SELECT setval('users_id_seq', 410, true);

COMMIT;

-- Verify
SELECT id, name, email, referral_code, created_at FROM users WHERE id IN (409, 410) ORDER BY id;
