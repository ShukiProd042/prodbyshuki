const router = require('express').Router();
const User   = require('../models/User');
const Order  = require('../models/Order');
const { authAdmin } = require('../middleware/auth');

router.get('/admin/all', authAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    const counts = await Order.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ]);
    const map = {};
    counts.forEach(c => { map[c._id.toString()] = c.count; });
    res.json(users.map(u => ({ ...u.toObject(), purchaseCount: map[u._id.toString()] || 0 })));
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.delete('/admin/:id', authAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
