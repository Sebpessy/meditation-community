# Referral System Fix Guide

## Current Situation
- 245 total users with 114 having referral codes
- 0 users properly attributed to referrers (all `referred_by` fields are NULL)
- 0 referral records exist in the referrals table
- 0 welcome/referral bonuses awarded

## New Admin Tools Created

### 1. Get Potential Matches
```bash
GET /api/admin/referral/potential-matches
```
Returns users who signed up within 7 days of someone with a referral code, helping identify likely referral relationships.

### 2. Manual Referral Attribution
```bash
POST /api/admin/referral/manual-attribute
Content-Type: application/json

{
  "referreeId": 253,
  "referrerId": 252, 
  "referralCode": "3FZY7PK1"
}
```

This will:
- ✅ Update referree's `referred_by` field
- ✅ Create referral record in database
- ✅ Award 50 Quantum Love points to referree (welcome bonus)
- ✅ Award 100 Quantum Love points to referrer (referral bonus)

## Example Usage

If you know Susan Findlay (ID: 253) was referred by Kim Hixson (ID: 252) using code "3FZY7PK1":

```bash
curl -X POST http://localhost:5000/api/admin/referral/manual-attribute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "referreeId": 253,
    "referrerId": 252,
    "referralCode": "3FZY7PK1"
  }'
```

## Safety Features
- ✅ Only admins can access these endpoints
- ✅ Validates both users exist
- ✅ Prevents double-attribution (checks if user already has a referrer)
- ✅ Verifies referral code belongs to specified referrer
- ✅ Creates complete audit trail with bonuses and records

## Recommended Process
1. Review potential matches from the API
2. Cross-reference with any external data/communication you have
3. Use manual attribution tool for confirmed referrals
4. Monitor the results in the admin dashboard

## Future Improvements
The registration flow is now fixed, so new users who sign up with referral codes will be automatically attributed correctly.