-- Run these migrations on your PostgreSQL database

-- 1. Add referred_by column to customers (if not exists)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referred_by VARCHAR(10);

-- 2. Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(user_id) ON DELETE CASCADE,
  balance NUMERIC(12, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id)
);

-- 3. Referral earnings table
CREATE TABLE IF NOT EXISTS referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES customers(user_id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES customers(user_id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Plans table (for subscriptions)
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  price INTEGER NOT NULL, -- in kobo
  currency VARCHAR(10) DEFAULT 'NGN',
  interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(user_id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  paystack_subscription_code VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  is_recurring BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Index for faster referral lookups
CREATE INDEX IF NOT EXISTS idx_customers_referred_by ON customers(referred_by);
CREATE INDEX IF NOT EXISTS idx_customers_referrer_id ON customers(referrer_id);
CREATE INDEX IF NOT EXISTS idx_request_user_id ON request(user_id);
-- Update package check constraint to include new package types
ALTER TABLE request DROP CONSTRAINT request_package_check;
ALTER TABLE request ADD CONSTRAINT request_package_check 
  CHECK (package IN ('basic', 'ironing', 'premium', 'wash & fold', 'deluxe'));

-- 7. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES customers(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Withdrawals table (for referral earnings payouts)
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES customers(user_id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, rejected
  created_at TIMESTAMP DEFAULT NOW()
);
