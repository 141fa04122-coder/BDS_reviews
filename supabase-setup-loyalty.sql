-- Loyalty Points System - Add to existing Supabase tables

-- Customers - add points and referral columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_joined BOOLEAN DEFAULT FALSE;

-- Points history
CREATE TABLE IF NOT EXISTS points_history (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  points INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'review', 'referral_given', 'referral_received', 'redemption'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals tracking
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER REFERENCES customers(id),
  referee_id INTEGER REFERENCES customers(id),
  referral_code TEXT NOT NULL,
  referrer_rewarded BOOLEAN DEFAULT FALSE,
  referee_rewarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo codes redeemed
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  promo_code TEXT NOT NULL,
  offer_type TEXT NOT NULL,
  discount_value TEXT,
  expires_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_points_history_customer ON points_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_customer ON promo_redemptions(customer_id);

-- RPC function to atomically increment customer points
CREATE OR REPLACE FUNCTION increment_customer_points(p_customer_id INTEGER, p_points INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE customers SET total_points = COALESCE(total_points, 0) + p_points
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
