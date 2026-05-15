# Manchester Biryani House - Cloud Kitchen Review System

An intelligent, mobile-first review system for cloud kitchen customers. Customers scan a QR code, verify via phone/email, and complete a 2-minute adaptive survey.

## Features

- **Smart Verification**: Phone number or email verification (demo auto-verifies)
- **Intelligent Survey Flow**: Questions adapt based on previous answers
- **Mobile-First Design**: Beautiful, responsive UI optimized for phones
- **Quick Completion**: 2-minute survey with checkbox/option-based questions
- **Data Storage**: All responses stored in SQLite database
- **QR Code Generation**: Easy barcode creation for in-store display
- **Cloud Kitchen Specific**: Tailored to biryani/Manchester cloud kitchen context

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Start the server
npm start

# Or use development mode with auto-reload
npm run dev
```

Open http://localhost:3000 to access the QR generator.

## Deployment Options

### Option 1: Railway (Recommended - Free Tier)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway new
railway add
railway deploy
```

### Option 2: Render (Free Tier)
1. Push code to GitHub
2. Create new Web Service on Render
3. Select Node.js environment
4. Build command: `npm install`
5. Start command: `npm start`

### Option 3: Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option 4: Any VPS/Server
```bash
# Clone and run
git clone <your-repo>
cd cloud-kitchen-review
npm install
npm start

# Use PM2 for production
npm install -g pm2
pm2 start server.js --name review-system
```

## How It Works

1. **Customer scans QR code** → Opens review form in browser
2. **Verification step** → Enters phone number or email
3. **Survey begins** → Adaptive questions appear (2-3 minutes)
4. **Completion** → Thank you message, data saved
5. **Admin view** → Access all responses via database

## Survey Flow

```
Start
  ↓
Overall Rating (1-5 stars)
  ↓
Did you like the food? (Yes/No/Okay)
  ↓
Which dishes did you order? (Biryani types, sides, drinks)
  ↓
How often do you order? (Daily/Weekly/Monthly/First-timer)
  ↓
What type of food do you prefer? (Spicy/Medium/Mild/etc.)
  ↓
What matters more? (Taste/Offers/Speed/Value)
  ↓
Preferred ambiance? (Couple/Family/Kids/Students)
  ↓
Which combo deals interest you? (If group/family selected)
  ↓
What would you like to see next visit?
  ↓
Would you recommend us?
  ↓
Additional comments (optional)
  ↓
Will you order again?
  ↓
Complete ✓
```

## Database Schema

- **customers**: Phone, email, first visit date
- **survey_responses**: All survey answers with timestamps
- **verification_attempts**: Track verification attempts (optional OTP)

## Customization

### Add/Modify Questions
Edit `survey-rules.js` - the `questions` array contains all question definitions. Each question has:
- `id`: Unique identifier
- `type`: rating/radio/checkbox/textarea
- `question`: Display text
- `options`: Answer choices
- `nextCondition`: Function returning next question ID based on answer

### Change Styling
Modify CSS in `public/review.html`. The design uses a gradient theme (purple/pink).

### Branding
Update header section in `public/review.html` - change restaurant name, logo emoji, colors.

## Accessing Data

### Direct database query:
```bash
sqlite3 reviews.db
SELECT * FROM survey_responses;
```

### Export to CSV:
```bash
sqlite3 -header -csv reviews.db "SELECT * FROM survey_responses;" > exports.csv
```

## Environment Variables

```bash
PORT=3000                    # Server port (default: 3000)
NODE_ENV=production          # Environment mode
```

## Files Structure

```
├── server.js              # Express API server
├── database.js            # SQLite setup
├── survey-rules.js        # Question flow logic
├── package.json           # Dependencies
├── public/
│   ├── review.html       # Customer survey page
│   └── index.html        # QR code generator admin
└── reviews.db            # SQLite database (auto-created)
```

## Security Notes

- Demo uses auto-verification (no OTP)
- For production, implement SMS/email OTP verification in `/api/verify`
- Add CAPTCHA to prevent bot submissions
- Use HTTPS in production
- Sanitize database inputs

## Support

For issues or customizations, contact your development team.

---

**Ready to launch!** Deploy the server, generate your QR code, and start collecting customer feedback today.
