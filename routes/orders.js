const router  = require('express').Router();
const Order   = require('../models/Order');
const Beat    = require('../models/Beat');
const User    = require('../models/User');
const { authUser, authAdmin } = require('../middleware/auth');
const { sendOrderConfirmed, sendOrderReceived, sendAdminNotification } = require('../middleware/email');

// POST /api/orders — user submits an order (after sending payment)
router.post('/', authUser, async (req, res) => {
  try {
    const { items, license, payMethod, txRef } = req.body;
    // items = [{ beatId }]
    if (!items?.length || !license || !payMethod || !txRef)
      return res.status(400).json({ error: 'Missing required fields' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch beats and compute total
    const beats = await Beat.find({ _id: { $in: items.map(i => i.beatId) } });
    if (!beats.length) return res.status(400).json({ error: 'No valid beats found' });

    const multipliers = { lease: 1, premium: 1.8, exclusive: 5 };
    const mult  = multipliers[license] || 1;
    const total = beats.reduce((sum, b) => sum + b.price * mult, 0);

    const order = await Order.create({
      user:        user._id,
      userName:    user.name,
      userEmail:   user.email,
      items:       beats.map(b => ({ beat: b._id, beatName: b.name, price: +(b.price * mult).toFixed(2) })),
      license,
      totalAmount: +total.toFixed(2),
      payMethod,
      txRef
    });

    // Send "received" email to buyer
    await sendOrderReceived(order);

    // Notify admin immediately
    await sendAdminNotification(order);

    res.status(201).json({ orderId: order._id, message: 'Order submitted. Awaiting payment verification.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/my — user gets their own orders
router.get('/my', authUser, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.beat', 'name genre')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN ────────────────────────────────────────────────────

// GET /api/orders/admin/all — all orders
router.get('/admin/all', authAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const orders = await Order.find(filter)
      .populate('items.beat', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/admin/stats — dashboard numbers
router.get('/admin/stats', authAdmin, async (req, res) => {
  try {
    const [allOrders, users, beats] = await Promise.all([
      Order.find(),
      User.countDocuments(),
      Beat.countDocuments({ status: 'active' })
    ]);
    const confirmed  = allOrders.filter(o => o.status === 'confirmed');
    const pending    = allOrders.filter(o => o.status === 'pending');
    const revenue    = confirmed.reduce((s, o) => s + o.totalAmount, 0);

    // Monthly revenue for chart (last 12 months)
    const monthly = {};
    confirmed.forEach(o => {
      const key = new Date(o.createdAt).toLocaleString('en', { month: 'short', year: '2-digit' });
      monthly[key] = (monthly[key] || 0) + o.totalAmount;
    });

    res.json({
      totalRevenue:    +revenue.toFixed(2),
      totalOrders:     allOrders.length,
      pendingOrders:   pending.length,
      confirmedOrders: confirmed.length,
      totalUsers:      users,
      activeBeats:     beats,
      monthlyRevenue:  monthly
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/admin/:id/confirm — admin confirms order, sends files
router.put('/admin/:id/confirm', authAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.beat');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'confirmed')
      return res.status(400).json({ error: 'Already confirmed' });

    order.status      = 'confirmed';
    order.confirmedAt = new Date();
    await order.save();

    // If exclusive — mark beat as sold
    if (order.license === 'exclusive') {
      await Beat.updateMany(
        { _id: { $in: order.items.map(i => i.beat?._id || i.beat) } },
        { status: 'sold' }
      );
    }

    // Send confirmation email to buyer with download link
    await sendOrderConfirmed(order);

    res.json({ message: 'Order confirmed and email sent to buyer.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/admin/:id/reject
router.put('/admin/:id/reject', authAdmin, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id, { status: 'rejected' }, { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order rejected.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
