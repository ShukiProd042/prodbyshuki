const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const Order  = require('../models/Order');
const Beat   = require('../models/Beat');
const { authUser } = require('../middleware/auth');

// GET /api/downloads/:beatId — user must have confirmed order for this beat
router.get('/:beatId', authUser, async (req, res) => {
  try {
    const order = await Order.findOne({
      user:           req.user.id,
      'items.beat':   req.params.beatId,
      status:         'confirmed'
    });

    if (!order)
      return res.status(403).json({ error: 'Purchase required to download this file.' });

    const beat = await Beat.findById(req.params.beatId);
    if (!beat || !beat.beatFile)
      return res.status(404).json({ error: 'File not found. Contact support.' });

    const filePath = path.resolve(`uploads/beats/${beat.beatFile}`);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: 'File missing on server. Contact support.' });

    res.download(filePath, `${beat.name}.${path.extname(beat.beatFile).slice(1)}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
