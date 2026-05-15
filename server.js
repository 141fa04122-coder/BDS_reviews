const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const db = require('./supabase-database');
const surveyRules = require('./survey-rules');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Export for Vercel serverless
module.exports = app;

// Test database connection on startup
db.testConnection().catch(console.error);

// Verify user by phone or email
app.post('/api/verify', async (req, res) => {
  const { phone, email, referralCode } = req.body;

  if (!phone && !email) {
    return res.status(400).json({
      verified: false,
      message: 'Please provide phone number or email'
    });
  }

  let referralBonus = 0;
  const usedReferral = Boolean(referralCode);

  try {
    const customer = await db.findOrCreateCustomer(phone, email);
    const sessionId = uuidv4();

    // Process referral code if provided
    if (referralCode) {
      const { data: referrer } = await db.supabase
        .from('customers')
        .select('id, total_points')
        .eq('referral_code', referralCode.toUpperCase())
        .single();

      if (referrer && referrer.id !== customer.id) {
        // Check for duplicate referral
        const { data: existing } = await db.supabase
          .from('referrals')
          .select('*')
          .eq('referee_id', customer.id)
          .single();

        if (!existing) {
          await db.supabase
            .from('referrals')
            .insert([{ referrer_id: referrer.id, referee_id: customer.id, referral_code: referralCode.toUpperCase() }]);

          referralBonus = 25; //instant bonus for using code

          await db.supabase
            .from('points_history')
            .insert([
              { customer_id: referrer.id, points: 100, action: 'referral_given', description: `Referred new customer using code ${referralCode}` },
              { customer_id: customer.id, points: 50, action: 'referral_received', description: `Referred by code ${referralCode}` }
            ]);

          await db.supabase.rpc('increment_customer_points', { p_customer_id: referrer.id, p_points: 100 });
          await db.supabase.rpc('increment_customer_points', { p_customer_id: customer.id, p_points: referralBonus });
        }
      }
    }

    res.json({
      verified: true,
      customerId: customer.id,
      sessionId: sessionId,
      referralBonus,
      message: referralBonus > 0 ? `Welcome! You earned ${referralBonus} bonus points via referral!` : 'Verification successful'
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get first question
app.get('/api/start-survey', (req, res) => {
  const { sessionId, customerId } = req.query;

  if (!sessionId || !customerId) {
    return res.status(400).json({
      error: 'Session ID and Customer ID required'
    });
  }

  const firstQuestion = surveyRules.getFirstQuestion();

  res.json({
    sessionId,
    customerId,
    question: firstQuestion,
    progress: 1,
    totalQuestions: estimateTotalQuestions()
  });
});

function estimateTotalQuestions() {
  return 15;
}

// Submit answer and get next question
app.post('/api/answer', (req, res) => {
  const { sessionId, customerId, questionId, answer } = req.body;

  if (!sessionId || !customerId || !questionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const nextQuestion = surveyRules.getNextQuestion(questionId, answer);

  if (nextQuestion) {
    res.json({
      question: nextQuestion,
      hasMore: true
    });
  } else {
    res.json({
      complete: true,
      message: 'Thank you for your feedback!'
    });
  }
});

// Save complete survey response
app.post('/api/complete-survey', async (req, res) => {
  const { sessionId, customerId, answers } = req.body;

  if (!sessionId || !customerId || !answers) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await db.saveSurveyResponse(sessionId, customerId, answers);

    res.json({
      success: true,
      message: 'Thank you for completing the survey! We appreciate your feedback.'
    });
  } catch (error) {
    console.error('Error saving survey:', error);
    res.status(500).json({ error: 'Failed to save survey' });
  }
});

// Generate QR code for review link
app.post('/api/generate-qr', async (req, res) => {
  const { baseUrl } = req.body;

  const reviewUrl = `${baseUrl || 'http://localhost:3000'}/review.html?r=${uuidv4()}`;

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(reviewUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      qrCode: qrCodeDataUrl,
      reviewUrl: reviewUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Serve admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Get all responses for admin dashboard
app.get('/api/responses', async (req, res) => {
  try {
    const responses = await db.getAllResponses();
    res.json({ success: true, responses });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// Export CSV
app.get('/api/export/csv', async (req, res) => {
  try {
    const responses = await db.getAllResponses();

    if (responses.length === 0) {
      return res.status(404).send('No data to export');
    }

    const headers = Object.keys(responses[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of responses) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const strValue = String(value);
        return strValue.includes(',') ? `"${strValue}"` : strValue;
      });
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=survey_responses.csv');
    res.send(csvString);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Save complete survey response + award points
app.post('/api/complete-survey', async (req, res) => {
  const { sessionId, customerId, answers } = req.body;

  if (!sessionId || !customerId || !answers) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await db.saveSurveyResponse(sessionId, customerId, answers);

    // Award 50 points for completing survey
    const { error: pointsError } = await db.supabase
      .from('points_history')
      .insert([{
        customer_id: customerId,
        points: 50,
        action: 'review',
        description: 'Completed customer satisfaction survey'
      }]);

    if (!pointsError) {
      await db.supabase.rpc('increment_customer_points', { p_customer_id: customerId, p_points: 50 });
    }

    // Check if first review bonus
    const { count } = await db.supabase
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    const isFirst = count === 1;

    // Generate or get referral code
    const { data: customer } = await db.supabase
      .from('customers')
      .select('referral_code, total_points, whatsapp_joined')
      .eq('id', customerId)
      .single();

    let referralCode = customer?.referral_code;
    if (!referralCode) {
      referralCode = 'BIRYANI' + Math.random().toString(36).substr(2, 6).toUpperCase();
      await db.supabase
        .from('customers')
        .update({ referral_code: referralCode })
        .eq('id', customerId);
    }

    // Get rewards progress
    const totalPoints = (customer?.total_points || 0) + 50;
    const pointsToDessert = Math.max(0, 500 - totalPoints);
    const pointsToDrink = Math.max(0, 1000 - totalPoints);

    res.json({
      success: true,
      message: 'Thank you for completing the survey!',
      pointsEarned: 50,
      isFirstReview: isFirst,
      totalPoints,
      referralCode,
      referralLink: `${window.location.origin}/review.html?ref=${referralCode}`,
      whatsappGroup: 'https://chat.whatsapp.com/thebiryanisVIP', // replace with actual
      rewards: {
        pointsToDessert,
        pointsToDrink,
        nextReward: pointsToDessert <= 0 ? 'dessert' : (pointsToDrink <= 0 ? 'drink' : (500 - totalPoints) + ' pts to dessert')
      }
    });
  } catch (error) {
    console.error('Error completing survey:', error);
    res.status(500).json({ error: 'Failed to save survey' });
  }
});

// Get customer loyalty data (points, referral, offers)
app.get('/api/loyalty/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const { data: customer } = await db.supabase
      .from('customers')
      .select('total_points, referral_code, whatsapp_joined, phone_number, email')
      .eq('id', customerId)
      .single();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get points history
    const { data: history } = await db.supabase
      .from('points_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get active promos
    const { data: promos } = await db.supabase
      .from('promo_redemptions')
      .select('*')
      .eq('customer_id', customerId)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    // Count referrals given
    const { count: refGiven } = await db.supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', customerId);

    // Count referrals received
    const { count: refReceived } = await db.supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referee_id', customerId);

    const totalPoints = customer.total_points || 0;

    res.json({
      success: true,
      loyalty: {
        totalPoints,
        referralCode: customer.referral_code,
        referralLink: `${req.protocol}://${req.get('host')}/review.html?ref=${customer.referral_code}`,
        whatsappGroup: 'https://chat.whatsapp.com/thebiryanisVIP',
        whatsappJoined: customer.whatsapp_joined || false,
        pointsToDessert: Math.max(0, 500 - totalPoints),
        pointsToDrink: Math.max(0, 1000 - totalPoints),
        referralsGiven: refGiven || 0,
        referralsReceived: refReceived || 0,
        history: history || [],
        activePromos: promos || [],
        nextReward: totalPoints >= 1000 ? 'Free Drink!' : (totalPoints >= 500 ? 'Free Dessert!' : `${500 - totalPoints} pts to Free Dessert`)
      }
    });
  } catch (error) {
    console.error('Loyalty fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch loyalty data' });
  }
});

// Join WhatsApp group (update user record)
app.post('/api/loyalty/join-whatsapp', async (req, res) => {
  const { customerId, phoneNumber } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID required' });
  }

  try {
    const { error } = await db.supabase
      .from('customers')
      .update({ whatsapp_joined: true })
      .eq('id', customerId);

    if (error) throw error;

    // Award 25 points for joining WhatsApp
    await db.supabase
      .from('points_history')
      .insert([{
        customer_id: customerId,
        points: 25,
        action: 'review',
        description: 'Joined WhatsApp VIP group'
      }]);

    await db.supabase.rpc('increment_customer_points', { p_customer_id: customerId, p_points: 25 });

    res.json({ success: true, pointsEarned: 25, whatsappLink: 'https://chat.whatsapp.com/thebiryanisVIP' });
  } catch (error) {
    console.error('WhatsApp join error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// Process referral code
app.post('/api/loyalty/referral', async (req, res) => {
  const { referralCode, refereePhone, refereeEmail } = req.body;

  if (!referralCode) {
    return res.status(400).json({ error: 'Referral code required' });
  }

  try {
    // Find referrer by code
    const { data: referrer } = await db.supabase
      .from('customers')
      .select('id, total_points')
      .eq('referral_code', referralCode.toUpperCase())
      .single();

    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // Check if referee already exists
    let { data: referee } = await db.supabase
      .from('customers')
      .select('id, total_points')
      .or(`phone_number.eq.${refereePhone},email.eq.${refereeEmail}`)
      .single();

    if (!referee) {
      // Create referee
      const { data: newReferee } = await db.supabase
        .from('customers')
        .insert([{ phone_number: refereePhone, email: refereeEmail, name: 'Referred Customer' }])
        .select()
        .single();
      referee = newReferee;
    }

    // Check if already referred
    const { data: existing } = await db.supabase
      .from('referrals')
      .select('*')
      .eq('referee_id', referee.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already used a referral code' });
    }

    // Create referral record
    await db.supabase
      .from('referrals')
      .insert([{
        referrer_id: referrer.id,
        referee_id: referee.id,
        referral_code: referralCode.toUpperCase()
      }]);

    // Award points to both
    const referrerBonus = 100;
    const refereeBonus = 50;

    await db.supabase
      .from('points_history')
      .insert([
        { customer_id: referrer.id, points: referrerBonus, action: 'referral_given', description: `Referred new customer using code ${referralCode}` },
        { customer_id: referee.id, points: refereeBonus, action: 'referral_received', description: `Referred by ${referralCode}` }
      ]);

    await db.supabase.rpc('increment_customer_points', { p_customer_id: referrer.id, p_points: referrerBonus });
    await db.supabase.rpc('increment_customer_points', { p_customer_id: referee.id, p_points: refereeBonus });

    res.json({
      success: true,
      message: 'Referral successful! Both accounts rewarded.',
      referrerBonus,
      refereeBonus,
      referrerNewTotal: (referrer.total_points || 0) + referrerBonus,
      refereeNewTotal: (referee.total_points || 0) + refereeBonus
    });
  } catch (error) {
    console.error('Referral error:', error);
    res.status(500).json({ error: 'Referral failed' });
  }
});

// Get customer points by phone/email
app.post('/api/loyalty/find', async (req, res) => {
  const { phone, email } = req.body;

  if (!phone && !email) {
    return res.status(400).json({ error: 'Phone or email required' });
  }

  try {
    let { data: customer } = await db.supabase
      .from('customers')
      .select('id, total_points, referral_code, phone_number, email')
      .eq('phone_number', phone)
      .single();

    if (!customer && email) {
      customer = await db.supabase
        .from('customers')
        .select('id, total_points, referral_code, phone_number, email')
        .eq('email', email)
        .single();
    }

    if (!customer) {
      return res.json({ found: false, message: 'No account found. Please complete a survey first.' });
    }

    // Get active promos
    const { data: promos } = await db.supabase
      .from('promo_redemptions')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString());

    res.json({
      found: true,
      customer: {
        id: customer.id,
        totalPoints: customer.total_points || 0,
        referralCode: customer.referral_code,
        nextReward: (customer.total_points || 0) >= 1000 ? 'Free Drink!' : (customer.total_points >= 500 ? 'Free Dessert!' : `${500 - (customer.total_points || 0)} pts to Free Dessert`),
        pointsToDessert: Math.max(0, 500 - (customer.total_points || 0)),
        pointsToDrink: Math.max(0, 1000 - (customer.total_points || 0))
      },
      activePromos: promos || []
    });
  } catch (error) {
    console.error('Loyalty find error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// Redeem points for a reward
app.post('/api/loyalty/redeem', async (req, res) => {
  const { customerId, rewardType } = req.body;

  if (!customerId || !rewardType) {
    return res.status(400).json({ error: 'Customer ID and reward type required' });
  }

  try {
    const { data: customer } = await db.supabase
      .from('customers')
      .select('total_points, referral_code')
      .eq('id', customerId)
      .single();

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const points = customer.total_points || 0;
    let cost = 0, offer = '';

    if (rewardType === 'dessert' && points >= 500) {
      cost = 500;
      offer = 'Free Dessert with your next order';
    } else if (rewardType === 'drink' && points >= 1000) {
      cost = 1000;
      offer = 'Free Drink with your next order';
    } else {
      return res.status(400).json({ error: 'Not enough points for this reward' });
    }

    // Deduct points
    const newBalance = points - cost;

    await db.supabase
      .from('points_history')
      .insert([{
        customer_id: customerId,
        points: -cost,
        action: 'redemption',
        description: `Redeemed: ${offer}`
      }]);

    await db.supabase
      .from('customers')
      .update({ total_points: newBalance })
      .eq('id', customerId);

    // Create promo code (30 days expiry)
    const promo = `REWARD-${customer.referral_code || customer.id}-${Date.now().toString(36).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await db.supabase
      .from('promo_redemptions')
      .insert([{
        customer_id: customerId,
        promo_code: promo,
        offer_type: rewardType,
        discount_value: '100%',
        expires_at: expiresAt
      }]);

    // Find customer contact
    const { data: cust } = await db.supabase
      .from('customers')
      .select('phone_number, email')
      .eq('id', customerId)
      .single();

    res.json({
      success: true,
      promoCode: promo,
      offer,
      newBalance,
      expiresAt: new Date(expiresAt).toLocaleDateString('en-GB'),
      message: 'Show this promo code at checkout!',
      expiryNote: 'Valid for 30 days from today.'
    });
  } catch (error) {
    console.error('Redemption error:', error);
    res.status(500).json({ error: 'Redemption failed' });
  }
});

// Create the database function for incrementing points (run once in Supabase SQL)
// Already included in supabase-setup-loyalty.sql below

// Serve the review page
app.get('/review.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'review.html'));
});

// Default route - show admin dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server (only when run directly, not in Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Cloud Kitchen Review System running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to test`);
  });
}
