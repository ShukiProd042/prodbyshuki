require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const helmet   = require('helmet');
const cors     = require('cors');
const path     = require('path');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/previews', express.static(path.join(__dirname, 'uploads/previews')));

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/beats',     require('./routes/beats'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/downloads', require('./routes/downloads'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/services',  require('./routes/services'));

// Catch-all
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Shuki Production running on http://localhost:${process.env.PORT || 5000}`)
    );
  })
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });
