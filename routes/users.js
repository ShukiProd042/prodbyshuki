const router = require('express').Router();
const User   = require('../models/User');
const Order  = require('../models/Order');
const { authAdmin } = require('../middleware/auth');

// GET /api/users/admin/all
router.get('/admin/all', authAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    // Add purchase count per user
    const withCounts = await Promise.all(users.map(async u => {
      const count = await Order.countDocuments({ user: u._id, status: 'confirmed' });
      return { ...u.toObject(), purchaseCount: count };
    }));
    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/admin/:id
router.delete('/admin/:id', authAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
