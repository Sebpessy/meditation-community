-- Migrate users 409 & 410 from Replit to Railway
-- Run this in Railway PostgreSQL database

BEGIN;

-- Insert user 409: Bille Biene
INSERT INTO users (
  id, email, name, firebase_uid, profile_picture, is_admin, is_garden_angel,
  is_banned, banned_at, banned_reason, last_login_ip, profile_completed,
  referral_code, referred_by, quantum_love_points, created_at
) VALUES (
  409,
  'billebiene@googlemail.com',
  'Bille Biene',
  'UaEPbikTyTU3LRokuhwYJwGkK6j2',
  'data:image/jpeg;base64,/9j/4QZ8PD94cGFja2V0IGJlZ2luPScnIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4'...,
  false, false, false, NULL, NULL, NULL, false, 'GQGU6YNC', NULL, 0,
  '2025-10-03 17:15:56.496996'::timestamp
) ON CONFLICT (id) DO NOTHING;

-- Insert user 410: Lorena Lacerda
INSERT INTO users (
  id, email, name, firebase_uid, profile_picture, is_admin, is_garden_angel,
  is_banned, banned_at, banned_reason, last_login_ip, profile_completed,
  referral_code, referred_by, quantum_love_points, created_at
) VALUES (
  410,
  'lorenaal@terra.com.br',
  'Lorena Lacerda',
  'JONM6uDJjTX4pgUq9Iwnb711nNq2',
  'data:image/jpeg;base64,/9j/4QaQPD94cGFja2V0IGJlZ2luPScnIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4'...,
  false, false, false, NULL, NULL, NULL, false, '7CJ2REYH', NULL, 0,
  '2025-10-03 22:23:11.575405'::timestamp
) ON CONFLICT (id) DO NOTHING;

-- Update the users ID sequence to continue from 411
SELECT setval('users_id_seq', 410, true);

COMMIT;

-- Verify
SELECT id, name, email, referral_code FROM users WHERE id IN (409, 410) ORDER BY id;
