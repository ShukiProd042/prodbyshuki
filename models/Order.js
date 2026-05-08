const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
    required: true
  },
  userName:  { type: String },
  userEmail: { type: String },
  items: [{
    beat:    { type: mongoose.Schema.Types.ObjectId, ref: 'Beat' },
    beatName:{ type: String },
    price:   { type: Number }
  }],
  license:     { type: String, enum: ['lease','premium','exclusive'], required: true },
  totalAmount: { type: Number, required: true },
  payMethod:   { type: String, enum: ['wise','payoneer'], required: true },
  txRef:       { type: String, required: true }, // transaction reference from buyer
  status:      { type: String, enum: ['pending','confirmed','rejected'], default: 'pending' },
  confirmedAt: { type: Date },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
