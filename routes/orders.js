const router = require('express').Router();
const Order  = require('../models/Order');
const Beat   = require('../models/Beat');
const User   = require('../models/User');
const { authUser, authAdmin } = require('../middleware/auth');
const { sendAdminNotification, sendOrderReceived, sendOrderConfirmed } = require('../middleware/email');

const MULT = { lease: 1, premium: 1.8, exclusive: 5 };

// POST /api/orders — submit order
router.post('/', authUser, async (req, res) => {
  try {
    const { items, license, payMethod, txRef } = req.body;
    if (!items?.length || !license || !payMethod || !txRef)
      return res.status(400).json({ error: 'All fields required' });

    const user   = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const mult   = MULT[license] || 1;
    const beats  = await Beat.find({ _id: { $in: items.map(i => i.beatId) }, status: 'active' });
    if (!beats.length) return res.status(400).json({ error: 'No valid beats found' });

    const total  = beats.reduce((s, b) => s + b.price * mult, 0);

    const order  = await Order.create({
      user:        user._id,
      userName:    user.name,
      userEmail:   user.email,
      items:       beats.map(b => ({ beat: b._id, beatName: b.name, price: +(b.price * mult).toFixed(2) })),
      license,
      totalAmount: +total.toFixed(2),
      payMethod,
      txRef
    });

    sendOrderReceived(order).catch(() => {});
    sendAdminNotification(order).catch(() => {});

    res.status(201).json({ orderId: order._id, message: 'Order submitted' });
  } catch(err) {
    console.error('Order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/my
router.get('/my', authUser, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/admin/stats
router.get('/admin/stats', authAdmin, async (req, res) => {
  try {
    const [orders, beatCount, userCount] = await Promise.all([
      Order.find(),
      Beat.countDocuments({ status: 'active' }),
      User.countDocuments()
    ]);
    const confirmed = orders.filter(o => o.status === 'confirmed');
    const totalRevenue = confirmed.reduce((s, o) => s + o.totalAmount, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    const monthlyRevenue = {};
    confirmed.forEach(o => {
      const k = new Date(o.confirmedAt || o.createdAt).toLocaleString('en', { month: 'short', year: '2-digit' });
      monthlyRevenue[k] = (monthlyRevenue[k] || 0) + o.totalAmount;
    });

    res.json({ totalRevenue, activeBeats: beatCount, totalOrders: orders.length, totalUsers: userCount, pendingOrders, monthlyRevenue });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/admin/all
router.get('/admin/all', authAdmin, async (req, res) => {
  try {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    const orders = await Order.find(q).sort({ createdAt: -1 });
    res.json(orders);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/orders/admin/:id/confirm
router.put('/admin/:id/confirm', authAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status      = 'confirmed';
    order.confirmedAt = new Date();
    await order.save();

    if (order.license === 'exclusive') {
      await Beat.updateMany({ _id: { $in: order.items.map(i => i.beat) } }, { status: 'sold' });
    }

    sendOrderConfirmed(order).catch(() => {});
    res.json({ message: 'Confirmed' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/orders/admin/:id/reject
router.put('/admin/:id/reject', authAdmin, async (req, res) => {
  try {
    await Order.findByIdAndUpdate(req.params.id, { status: 'rejected' });
    res.json({ message: 'Rejected' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
