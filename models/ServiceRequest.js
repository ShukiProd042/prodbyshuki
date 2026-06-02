const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  email:   { type: String, required: true },
  service: { type: String, required: true },
  message: String,
  status:  { type: String, enum: ['pending','contacted','completed'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('ServiceRequest', serviceSchema);
