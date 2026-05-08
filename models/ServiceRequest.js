const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true },
  service:   { type: String, required: true },
  message:   { type: String, default: '' },
  status:    { type: String, enum: ['pending','contacted','completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ServiceRequest', serviceSchema);
