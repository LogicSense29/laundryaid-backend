-- SQL: PostgreSQL
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(225) UNIQUE,
  referrer_code VARCHAR(10) UNIQUE,
  referred_by_code VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- MVP USERS
CREATE TABLE user (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(225) UNIQUE,
  referred_number TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE requests (
   request_id PRIMARY KEY DEFAULT gen_random_uuid(),
   user UUID NOT NULL,
   contact VARCHAR(20),
   address TEXT NOT NULL,
   package TEXT NOT NULL,
   FORIEGN KEY user REFERENCES users(user_id),
);

-- PACKAGES
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL, -- wash & fold, premium, deluxe
  currency VARCHAR(10) DEFAULT 'NGN',
  price NUMERIC(10, 2) NOT NULL,
  description TEXT,
  clothes_limit INTEGER DEFAULT 80
);

CREATE TABLE promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,              -- e.g. 'SUMMER25'
  description TEXT,                              -- Optional description
  type VARCHAR(20) NOT NULL,                     -- 'percentage' or 'fixed'
  value DECIMAL(10, 2) NOT NULL,                 -- e.g., 25.00 for 25% or $25
  min_order_amount DECIMAL(10, 2),               -- Optional: minimum cart/package value
  usage_limit INTEGER,                           -- Optional: total times this code can be used
  used_count INTEGER DEFAULT 0,                  -- Track how many times it's been used
  start_date TIMESTAMP,                          -- Optional: when promo starts
  end_date TIMESTAMP,                            -- Optional: when promo ends
  is_active BOOLEAN DEFAULT TRUE,                -- Toggle promo availability
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_promo_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  promo_code_id UUID NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, promo_code_id), -- one use per user
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id)
);


-- SUBSCRIPTIONS
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  package_id INTEGER REFERENCES packages(id),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE laundry_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, picked_up, ready
  pickup_date DATE,
  clothes_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

--MVP REQUETS
CREATE TABLE requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id), 
  contact VARCHAR(20),
  address TEXT NOT NULL,
  package VARCHAR(30) CHECK (package IN ('wash & fold', 'premium', 'deluxe')),
  status VARCHAR(20) DEFAULT 'pending', -- values: pending, picked_up, ready
  pickup_date DATE,
  delivery_date DATE,
  pickup_option VARCHAR(30) CHECK (pickup_option IN ('deliver', 'Pick up')),
  clothes_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);


-- PAYMENTS
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  request_id UUID REFERENCES laundry_requests(id),
  amount NUMERIC(10, 2),
  status VARCHAR(20), -- success, failed
  payment_date TIMESTAMP DEFAULT NOW()
);

-- TEST PAYMENTS
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES customers(user_id),
  request_id UUID REFERENCES request(request_id),
  package_id UUID REFERENCES packages(id),
  -- currency VARCHAR(10) DEFAULT 'NGN',
  -- amount NUMERIC(10, 2),
  paystack_reference VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20), -- success, failed
  payment_date TIMESTAMP DEFAULT NOW()
);

CREATE TABLE visits (
  id SERIAL PRIMARY KEY,
  visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp TEXT NOT NULL,  -- Temporary OTP storage
    otp_expires_at TIMESTAMP NOT NULL, -- Expiry time
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(user_id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,

  paystack_subscription_code VARCHAR(100), 
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  cancel_at TIMESTAMP,
  canceled_at TIMESTAMP,
  trial_end TIMESTAMP,

  is_recurring BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(user_id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  request_id UUID REFERENCES request(request_id) ON DELETE SET NULL,
  
  amount INTEGER NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  paystack_reference VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'success', -- success, failed, pending
  channel VARCHAR(50), -- card, bank, etc.
  paid_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  price INTEGER NOT NULL, -- in kobo
  currency VARCHAR(10) DEFAULT 'NGN',
  interval VARCHAR(20) NOT NULL, -- monthly, yearly
  -- paystack_plan_code VARCHAR(100) UNIQUE NOT NULL, -- from Paystack
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

