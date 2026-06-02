const mongoose = require('mongoose');

const beatSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  genre:       { type: String, default: 'trap' },
  bpm:         { type: Number },
  key:         { type: String },
  price:       { type: Number, required: true },
  description: { type: String },
  previewFile: { type: String },
  beatFile:    { type: String },
  type:        { type: String, enum: ['beat','preset'], default: 'beat' },
  status:      { type: String, enum: ['active','sold','draft'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Beat', beatSchema);
