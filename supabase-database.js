const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

// Initialize Supabase client if credentials exist
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client initialized');
} else {
  console.log('⚠️  No SUPABASE_URL/SUPABASE_ANON_KEY found. Using local SQLite.');
  console.log('   For production: create .env file with Supabase credentials');
}

// Initialize: verify connection and tables exist
async function initSupabase() {
  if (!supabase) return;

  try {
    // Test connection
    const { error } = await supabase.from('customers').select('count').limit(1);
    if (error) {
      console.log('⚠️  Tables not found. Run supabase-setup.sql in Supabase SQL Editor.');
      console.log('   Or create tables manually before deploying.');
      return;
    }
    console.log('✅ Database connection verified');
  } catch (err) {
    console.log('⚠️  Database check skipped:', err.message);
  }
}

// Find or create customer
async function findOrCreateCustomer(phone, email) {
  if (!supabase) {
    const db = require('./database');
    let customer = null;

    if (phone) {
      customer = db.prepare('SELECT * FROM customers WHERE phone_number = ?').get(phone);
    }
    if (!customer && email) {
      customer = db.prepare('SELECT * FROM customers WHERE email = ?').get(email);
    }

    if (!customer) {
      const stmt = db.prepare('INSERT INTO customers (phone_number, email, name) VALUES (?, ?, ?)');
      stmt.run(phone, email, 'Customer');
      customer = db.prepare('SELECT * FROM customers WHERE id = last_insert_rowid()').get();
    }
    return customer;
  }

  let { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone_number', phone)
    .single();

  if (!customer && email) {
    ({ data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single());
  }

  if (!customer) {
    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert([{ phone_number: phone, email: email, name: 'Customer' }])
      .select()
      .single();

    if (insertError) {
      console.error('Customer insert error:', insertError);
      throw insertError;
    }
    customer = newCustomer;
  }

  return customer;
}

// Save survey response
async function saveSurveyResponse(sessionId, customerId, answers) {
  if (!supabase) {
    const db = require('./database');
    const stmt = db.prepare(`
      INSERT INTO survey_responses (
        customer_id, session_id, overall_rating, liked_food,
        favourite_dishes, visit_frequency, food_preferences,
        cares_about_offers, ambiance_preference, preferred_deals,
        wants_to_return, additional_comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      customerId,
      sessionId,
      answers.overall_rating || null,
      answers.like_food === 'yes' ? true : (answers.like_food === 'no' ? false : null),
      answers.favourite_dishes ? JSON.stringify(answers.favourite_dishes) : null,
      answers.visit_frequency || null,
      answers.food_preferences ? JSON.stringify(answers.food_preferences) : null,
      answers.cares_about_offers ? JSON.stringify(answers.cares_about_offers) : null,
      answers.ambiance_preference ? JSON.stringify(answers.ambiance_preference) : null,
      answers.combo_deals_interest || answers.preferred_deals || null,
      answers.wants_to_return === 'yes' ? 1 : (answers.wants_to_return === 'maybe' ? 0 : -1),
      answers.additional_comments || null
    );
    return { success: true };
  }

  const { error } = await supabase
    .from('survey_responses')
    .insert({
      customer_id: customerId,
      session_id: sessionId,
      overall_rating: answers.overall_rating || null,
      liked_food: answers.like_food === 'yes' ? true : (answers.like_food === 'no' ? false : null),
      favourite_dishes: answers.favourite_dishes || null,
      visit_frequency: answers.visit_frequency || null,
      food_preferences: answers.food_preferences || null,
      cares_about_offers: typeof answers.cares_about_offers === 'boolean' ? answers.cares_about_offers : null,
      ambiance_preference: answers.ambiance_preference || null,
      preferred_deals: answers.combo_deals_interest || answers.preferred_deals || null,
      wants_to_return: answers.wants_to_return === 'yes' ? 1 : (answers.wants_to_return === 'maybe' ? 0 : -1),
      additional_comments: answers.additional_comments || null
    });

  if (error) {
    console.error('Save response error:', error);
    throw error;
  }

  return { success: true };
}

// Get all responses (for admin)
async function getAllResponses() {
  if (!supabase) {
    const db = require('./database');
    return db.prepare('SELECT * FROM survey_responses ORDER BY completed_at DESC').all();
  }

  const { data, error } = await supabase
    .from('survey_responses')
    .select('*')
    .order('completed_at', { ascending: false });

  if (error) {
    console.error('Fetch responses error:', error);
    throw error;
  }

  return data || [];
}

module.exports = {
  supabase,
  initSupabase,
  findOrCreateCustomer,
  saveSurveyResponse,
  getAllResponses
};
