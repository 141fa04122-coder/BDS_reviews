-- Run this in Supabase SQL Editor to create tables
-- Go to your Supabase project → SQL Editor → New Query → Paste and Run

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  phone_number TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT,
  first_visit_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey responses table
CREATE TABLE IF NOT EXISTS survey_responses (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  session_id TEXT UNIQUE NOT NULL,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  liked_food BOOLEAN,
  favourite_dishes TEXT[],
  visit_frequency TEXT,
  food_preferences TEXT[],
  cares_about_offers BOOLEAN,
  ambiance_preference TEXT[],
  preferred_deals TEXT,
  wants_to_return INTEGER CHECK (wants_to_return IN (-1, 0, 1)),
  additional_comments TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_survey_responses_completed_at ON survey_responses(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_survey_responses_session ON survey_responses(session_id);

-- Row Level Security (optional - disable if you want simple access)
-- ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public read" ON survey_responses FOR SELECT USING (true);
