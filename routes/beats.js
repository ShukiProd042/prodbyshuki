const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const Beat   = require('../models/Beat');
const { authAdmin } = require('../middleware/auth');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isPreview = file.fieldname === 'preview';
    const dir = isPreview ? 'uploads/previews' : 'uploads/beats';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.zip', '.rar', '.aif', '.aiff'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// GET /api/beats — public, returns active beats (no beatFile path)
router.get('/', async (req, res) => {
  try {
    const { type } = req.query; // ?type=beat or ?type=preset
    const filter = { status: 'active' };
    if (type) filter.type = type;
    const beats = await Beat.find(filter).select('-beatFile').sort({ createdAt: -1 });
    res.json(beats);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/beats/admin/all — admin only, returns everything
router.get('/admin/all', authAdmin, async (req, res) => {
  try {
    const beats = await Beat.find().sort({ createdAt: -1 });
    res.json(beats);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/beats — admin only, create beat
router.post('/', authAdmin, upload.fields([
  { name: 'preview', maxCount: 1 },
  { name: 'beatfile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, genre, bpm, key, price, description, type } = req.body;
    if (!name || !genre || !price)
      return res.status(400).json({ error: 'name, genre and price are required' });

    const beat = await Beat.create({
      name:        name.toUpperCase().trim(),
      genre,
      bpm:         bpm ? parseInt(bpm) : null,
      key:         key || '',
      price:       parseFloat(price),
      description: description || '',
      type:        type || 'beat',
      previewFile: req.files?.preview?.[0]?.filename || '',
      beatFile:    req.files?.beatfile?.[0]?.filename || ''
    });
    res.status(201).json(beat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/beats/:id — admin only, update beat
router.put('/:id', authAdmin, upload.fields([
  { name: 'preview', maxCount: 1 },
  { name: 'beatfile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, genre, bpm, key, price, description, status, type } = req.body;
    const update = {};
    if (name)        update.name        = name.toUpperCase().trim();
    if (genre)       update.genre       = genre;
    if (bpm)         update.bpm         = parseInt(bpm);
    if (key)         update.key         = key;
    if (price)       update.price       = parseFloat(price);
    if (description !== undefined) update.description = description;
    if (status)      update.status      = status;
    if (type)        update.type        = type;
    if (req.files?.preview?.[0])  update.previewFile = req.files.preview[0].filename;
    if (req.files?.beatfile?.[0]) update.beatFile    = req.files.beatfile[0].filename;

    const beat = await Beat.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!beat) return res.status(404).json({ error: 'Beat not found' });
    res.json(beat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/beats/:id — admin only
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    const beat = await Beat.findByIdAndDelete(req.params.id);
    if (!beat) return res.status(404).json({ error: 'Beat not found' });
    // Clean up files
    ['previews/' + beat.previewFile, 'beats/' + beat.beatFile].forEach(f => {
      const fp = 'uploads/' + f;
      if (beat.previewFile || beat.beatFile) {
        try { fs.unlinkSync(fp); } catch {}
      }
    });
    res.json({ message: 'Beat deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
