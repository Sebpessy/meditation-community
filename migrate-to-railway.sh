#!/bin/bash

# Check if secret exists
if [ -z "$RAILWAY_DATABASE_URL" ]; then
  echo "❌ ERROR: RAILWAY_DATABASE_URL secret not found!"
  echo "Please add it in Replit Secrets (Tools > Secrets)"
  exit 1
fi

echo "🚀 Migrating users 409 & 410 to Railway..."

psql "$RAILWAY_DATABASE_URL" << 'EOFSQL'
BEGIN;

INSERT INTO users (id, email, name, firebase_uid, profile_picture, is_admin, is_garden_angel, is_banned, banned_at, banned_reason, last_login_ip, profile_completed, referral_code, referred_by, quantum_love_points, created_at) 
VALUES 
(409, 'billebiene@googlemail.com', 'Bille Biene', 'UaEPbikTyTU3LRokuhwYJwGkK6j2', NULL, false, false, false, NULL, NULL, NULL, false, 'GQGU6YNC', NULL, 0, '2025-10-03 17:15:56.496996'),
(410, 'lorenaal@terra.com.br', 'Lorena Lacerda', 'JONM6uDJjTX4pgUq9Iwnb711nNq2', NULL, false, false, false, NULL, NULL, NULL, false, '7CJ2REYH', NULL, 0, '2025-10-03 22:23:11.575405')
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', 410, true);

COMMIT;

-- Verify
SELECT id, name, email, referral_code FROM users WHERE id >= 409 ORDER BY id;

EOFSQL

echo ""
echo "✅ Migration complete! Check the output above to verify users 409 & 410 are listed."
