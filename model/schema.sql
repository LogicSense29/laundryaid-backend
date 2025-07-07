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
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL, -- wash & fold, premium, deluxe
  price NUMERIC(10, 2) NOT NULL,
  description TEXT,
  clothes_limit INTEGER DEFAULT 80
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
  amount NUMERIC(10, 2),
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