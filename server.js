require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const path       = require('path');
const rateLimit  = require('express-rate-limit');

const app = express();

// ── SECURITY ────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // CSP off so inline scripts work
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));

// Rate limit auth routes
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many requests' } }));

// ── BODY PARSING ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── STATIC FILES ────────────────────────────────────────────
// Serve frontend HTML files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Serve beat previews publicly (MP3 previews only)
app.use('/previews', express.static(path.join(__dirname, 'uploads/previews')));

// NOTE: /uploads/beats is NOT served statically — downloads go through auth route

// ── API ROUTES ──────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/beats',     require('./routes/beats'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/downloads', require('./routes/downloads'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/services',  require('./routes/services'));

// ── CATCH-ALL: serve index.html for any unknown route ───────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── CONNECT DB & START ──────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Shuki Production running on http://localhost:${PORT}`);
      console.log(`   Admin panel: http://localhost:${PORT}/admin.html`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
