require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const helmet   = require('helmet');
const cors     = require('cors');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/previews', express.static(path.join(__dirname, 'uploads/previews')));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/beats',     require('./routes/beats'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/downloads', require('./routes/downloads'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/services',  require('./routes/services'));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Start server FIRST — then connect MongoDB
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Railway uses MONGO_URL, local uses MONGO_URI
const MONGO = process.env.MONGO_URL || process.env.MONGOURL || process.env.MONGO_URI;

if (!MONGO) {
  console.error('❌ No MongoDB URI found! Set MONGO_URL in Railway Variables.');
} else {
  mongoose.connect(MONGO)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err.message));
}
