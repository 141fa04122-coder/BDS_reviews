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
  const { phone, email } = req.body;

  if (!phone && !email) {
    return res.status(400).json({
      verified: false,
      message: 'Please provide phone number or email'
    });
  }

  try {
    const customer = await db.findOrCreateCustomer(phone, email);

    // Create a session for this survey
    const sessionId = uuidv4();

    res.json({
      verified: true,
      customerId: customer.id,
      sessionId: sessionId,
      message: 'Verification successful'
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
