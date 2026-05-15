const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

// Initialize Supabase client if credentials exist
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client initialized');
} else {
  console.log('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  console.log('   Set these in your Vercel project settings or local .env file');
}

// Test connection and list tables
async function testConnection() {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.from('survey_responses').select('count').limit(1);
    if (error) {
      console.log('⚠️  Tables not initialized. Run supabase-setup.sql in Supabase SQL Editor.');
      return false;
    }
    console.log('✅ Database connection verified');
    return true;
  } catch (err) {
    console.log('⚠️  Database check failed:', err.message);
    return false;
  }
}

// Find or create customer
async function findOrCreateCustomer(phone, email) {
  if (!supabase) {
    throw new Error('Supabase not initialized. Check environment variables.');
  }

  // Try to find by phone or email
  let { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('phone_number', phone)
    .single();

  if (!customer && email) {
    customer = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();
  }

  // Create if not exists
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
    throw new Error('Supabase not initialized. Check environment variables.');
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
      cares_about_offers: answers.cares_about_offers || null,
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
    throw new Error('Supabase not initialized. Check environment variables.');
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
  testConnection,
  findOrCreateCustomer,
  saveSurveyResponse,
  getAllResponses
};
