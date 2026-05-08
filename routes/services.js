const router  = require('express').Router();
const Service = require('../models/ServiceRequest');
const { authAdmin } = require('../middleware/auth');

// POST /api/services — anyone can submit
router.post('/', async (req, res) => {
  try {
    const { name, email, service, message } = req.body;
    if (!name || !email || !service)
      return res.status(400).json({ error: 'name, email and service required' });
    const sr = await Service.create({ name, email, service, message });
    res.status(201).json(sr);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/services/admin/all
router.get('/admin/all', authAdmin, async (req, res) => {
  try {
    const requests = await Service.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/services/admin/:id — update status
router.put('/admin/:id', authAdmin, async (req, res) => {
  try {
    const sr = await Service.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(sr);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
