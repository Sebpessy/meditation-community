-- Manual Referral Attribution Tool
-- This script helps administrators manually attribute referrals when they have evidence

-- Step 1: Find potential referral relationships (users who signed up shortly after referral code holders)
SELECT 
  u1.id as potential_referree_id,
  u1.name as potential_referree_name,
  u1.email as potential_referree_email,
  u1.created_at as referree_signup,
  u2.id as potential_referrer_id,
  u2.name as potential_referrer_name,
  u2.email as potential_referrer_email,
  u2.referral_code,
  u2.created_at as referrer_signup,
  EXTRACT(EPOCH FROM (u1.created_at - u2.created_at))/3600 as hours_apart
FROM users u1
JOIN users u2 ON u2.referral_code IS NOT NULL 
  AND u2.created_at < u1.created_at
  AND u1.created_at - u2.created_at < INTERVAL '7 days'
WHERE u1.referred_by IS NULL
ORDER BY u1.created_at DESC, hours_apart ASC;

-- Step 2: Manual attribution template (replace IDs as needed)
-- UPDATE users SET referred_by = [REFERRER_ID] WHERE id = [REFERREE_ID];
-- INSERT INTO referrals (referrer_id, referred_id, referral_code, status, created_at) 
-- VALUES ([REFERRER_ID], [REFERREE_ID], '[REFERRAL_CODE]', 'completed', NOW());

-- Step 3: Award retroactive welcome bonuses
-- INSERT INTO quantum_love_transactions (user_id, amount, type, description, created_at)
-- VALUES ([REFERREE_ID], 50, 'welcome_bonus', 'Retroactive welcome bonus for referral attribution', NOW());

-- Step 4: Award retroactive referral bonuses to referrers
-- INSERT INTO quantum_love_transactions (user_id, amount, type, description, referral_id, created_at)
-- VALUES ([REFERRER_ID], 100, 'referral_bonus', 'Retroactive referral bonus', [REFERRAL_ID], NOW());

-- Step 5: Update user point totals
-- UPDATE users SET quantum_love_points = quantum_love_points + 50 WHERE id = [REFERREE_ID];
-- UPDATE users SET quantum_love_points = quantum_love_points + 100 WHERE id = [REFERRER_ID];