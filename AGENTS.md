# Cloud Kitchen Review System - Agent Documentation

## Project Overview
Intelligent review system for Manchester Biryani House cloud kitchen. Customers scan QR code → verify via phone/email → complete 2-minute adaptive survey → feedback stored in SQLite.

## Quick Commands for Agents

### Install & Start Local Server
```bash
npm install
npm start
# Server runs at http://localhost:3000
```

### View Data
```bash
sqlite3 reviews.db "SELECT * FROM survey_responses ORDER BY completed_at DESC LIMIT 10;"
```

### Export All Data
```bash
sqlite3 -header -csv reviews.db "SELECT * FROM survey_responses;" > survey_export.csv
```

### Database Cleanup (if needed)
```bash
rm reviews.db
# Server will recreate empty database on next start
```

### Test the Survey Flow
```bash
# Open in browser
open http://localhost:3000
# Click "Generate QR Code" → scan with phone or open review.html directly
open http://localhost:3000/review.html
```

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express API (verify, survey, QR generation) |
| `database.js` | SQLite schema (customers, survey_responses) |
| `survey-rules.js` | Adaptive question flow & next-question logic |
| `public/review.html` | Mobile-optimized survey frontend |
| `public/index.html` | QR code generator admin page |

## Question Flow Logic

The survey uses a `nextCondition` function per question:
```javascript
// Example from survey-rules.js
{
  id: 'like_food',
  type: 'radio',
  question: 'Did you like the food?',
  nextCondition: (answer) => {
    if (answer === 'yes') return 'favourite_dishes';
    return 'what_went_wrong';
  }
}
```

Add/modify questions in `survey-rules.js` and restart server.

## Deployment Checklist

1. Push code to GitHub
2. Deploy to Railway/Render/Vercel
3. Set environment: `NODE_ENV=production`
4. Access admin page at `https://yourdomain.com`
5. Enter your deployed URL in QR generator
6. Download QR image
7. Print on receipts, packaging, or display in-store

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/verify` | POST | Verify phone/email, create session |
| `/api/start-survey` | GET | Get first question |
| `/api/answer` | POST | Submit answer, get next question |
| `/api/complete-survey` | POST | Finalize survey, save to DB |
| `/api/generate-qr` | POST | Generate QR code image |
| `/review.html` | GET | Customer survey page |

## Data Structure

### survey_responses columns:
- `id`, `customer_id`, `session_id`
- `overall_rating` (1-5)
- `liked_food` (boolean)
- `favourite_dishes` (JSON array)
- `visit_frequency` (daily/weekly/monthly/etc.)
- `food_preferences` (JSON array)
- `cares_about_offers` (JSON)
- `ambiance_preference` (JSON array)
- `preferred_deals` (combo type)
- `wants_to_return` (1/0/-1)
- `additional_comments` (text)
- `completed_at` (timestamp)

## Troubleshooting

**Database locked errors**: Stop all node processes, delete `reviews.db`, restart.

**QR code not generating**: Check server is running at `API_BASE`.

**Surveys not saving**: Check `reviews.db` is writable.

## Future Enhancements

- SMS OTP verification via Twilio/MessageBird
- Email verification links
- Analytics dashboard (daily/weekly reports)
- Webhook notifications for new reviews
- Multi-language support (Urdu/Hindi)
- Export to Google Sheets
