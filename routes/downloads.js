const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const Order  = require('../models/Order');
const Beat   = require('../models/Beat');
const { authUser } = require('../middleware/auth');

router.get('/:beatId', authUser, async (req, res) => {
  try {
    const order = await Order.findOne({
      user:   req.user.id,
      status: 'confirmed',
      'items.beat': req.params.beatId
    });
    if (!order) return res.status(403).json({ error: 'No confirmed order for this beat' });

    const beat = await Beat.findById(req.params.beatId);
    if (!beat?.beatFile) return res.status(404).json({ error: 'File not found' });

    const filePath = path.join(__dirname, '../uploads/beats', beat.beatFile);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on server' });

    res.download(filePath, beat.beatFile);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
