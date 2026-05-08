const mongoose = require('mongoose');

const beatSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  genre:       { type: String, enum: ['trap','drill','rnb','hiphop','preset'], required: true },
  bpm:         { type: Number },
  key:         { type: String },
  price:       { type: Number, required: true },
  description: { type: String, default: '' },
  previewFile: { type: String, default: '' }, // filename in /uploads/previews
  beatFile:    { type: String, default: '' }, // filename in /uploads/beats (private)
  type:        { type: String, enum: ['beat','preset'], default: 'beat' },
  status:      { type: String, enum: ['active','sold','draft'], default: 'active' },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Beat', beatSchema);
