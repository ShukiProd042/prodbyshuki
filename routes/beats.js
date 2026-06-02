const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const Beat   = require('../models/Beat');
const { authAdmin } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = file.fieldname === 'preview'
      ? path.join(__dirname, '../uploads/previews')
      : path.join(__dirname, '../uploads/beats');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// GET /api/beats — public
router.get('/', async (req, res) => {
  try {
    const q = { status: 'active' };
    if (req.query.type) q.type = req.query.type;
    if (req.query.genre && req.query.genre !== 'all') q.genre = req.query.genre;
    const beats = await Beat.find(q).sort({ createdAt: -1 });
    res.json(beats);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/beats/admin/all — admin
router.get('/admin/all', authAdmin, async (req, res) => {
  try {
    const beats = await Beat.find().sort({ createdAt: -1 });
    res.json(beats);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// POST /api/beats — admin add beat
router.post('/', authAdmin, upload.fields([{ name:'preview',max:1 },{ name:'beatfile',max:1 }]), async (req, res) => {
  try {
    const { name, genre, bpm, key, price, description, type } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price required' });
    const beat = await Beat.create({
      name, genre, bpm: bpm||undefined, key: key||undefined,
      price: parseFloat(price), description, type: type||'beat',
      previewFile: req.files?.preview?.[0]?.filename,
      beatFile:    req.files?.beatfile?.[0]?.filename,
    });
    res.status(201).json(beat);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/beats/:id — admin edit
router.put('/:id', authAdmin, upload.fields([{ name:'preview',max:1 },{ name:'beatfile',max:1 }]), async (req, res) => {
  try {
    const { name, genre, bpm, key, price, description, type, status } = req.body;
    const upd = { name, genre, bpm: bpm||undefined, key: key||undefined, price: parseFloat(price), description, type, status };
    if (req.files?.preview?.[0])  upd.previewFile = req.files.preview[0].filename;
    if (req.files?.beatfile?.[0]) upd.beatFile    = req.files.beatfile[0].filename;
    const beat = await Beat.findByIdAndUpdate(req.params.id, upd, { new: true });
    res.json(beat);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/beats/:id — admin delete
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    const beat = await Beat.findByIdAndDelete(req.params.id);
    if (!beat) return res.status(404).json({ error: 'Beat not found' });
    res.json({ message: 'Deleted' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
