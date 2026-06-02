const router  = require('express').Router();
const Service = require('../models/ServiceRequest');
const { authAdmin } = require('../middleware/auth');

router.post('/', async (req, res) => {
  try {
    const { name, email, service, message } = req.body;
    if (!name || !email || !service) return res.status(400).json({ error: 'Required fields missing' });
    const s = await Service.create({ name, email, service, message });
    res.status(201).json(s);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/admin/all', authAdmin, async (req, res) => {
  try {
    const svcs = await Service.find().sort({ createdAt: -1 });
    res.json(svcs);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.put('/admin/:id', authAdmin, async (req, res) => {
  try {
    const s = await Service.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(s);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
