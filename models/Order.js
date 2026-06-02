const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:    String,
  userEmail:   String,
  items: [{
    beat:     { type: mongoose.Schema.Types.ObjectId, ref: 'Beat' },
    beatName: String,
    price:    Number,
  }],
  license:     { type: String, enum: ['lease','premium','exclusive'], required: true },
  totalAmount: { type: Number, required: true },
  payMethod:   { type: String, enum: ['wise','payoneer'], required: true },
  txRef:       { type: String, required: true },
  status:      { type: String, enum: ['pending','confirmed','rejected'], default: 'pending' },
  confirmedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
