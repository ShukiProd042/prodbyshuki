const nodemailer = require('nodemailer');

const ADMIN_EMAIL = 'shundovskishuki1@gmail.com';

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

// ── 1. EMAIL TO ADMIN — new order arrived ────────────────────
async function sendAdminNotification(order) {
  try {
    const transporter = getTransporter();
    const itemList = order.items.map(i => `• ${i.beatName} — $${i.price?.toFixed(2)}`).join('<br>');
    const methodColor = order.payMethod === 'wise' ? '#9fe870' : '#ff6b00';

    await transporter.sendMail({
      from: `"Shuki Production" <${process.env.EMAIL_USER}>`,
      to:   ADMIN_EMAIL,
      subject: `🔔 New Order — $${order.totalAmount?.toFixed(2)} via ${order.payMethod?.toUpperCase()}`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#f0ece3;padding:40px;max-width:580px;margin:0 auto;border:1px solid #222">
          <h1 style="font-size:1.8rem;letter-spacing:3px;margin-bottom:4px">SHUKI<span style="color:#ff3c00">.</span></h1>
          <p style="color:#888;font-size:.75rem;letter-spacing:2px;margin-bottom:28px">ADMIN NOTIFICATION</p>

          <div style="background:#ff3c00;color:#fff;padding:12px 20px;border-radius:4px;margin-bottom:24px;display:inline-block">
            <strong>🔔 NEW ORDER RECEIVED</strong>
          </div>

          <div style="background:#111;border:1px solid #222;border-left:4px solid ${methodColor};padding:20px;border-radius:4px;margin-bottom:20px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="color:#888;padding:6px 0;font-size:.85rem">Order ID</td><td style="font-family:monospace;font-size:.8rem;color:#f0ece3">${order._id}</td></tr>
              <tr><td style="color:#888;padding:6px 0;font-size:.85rem">Buyer</td><td style="font-size:.9rem;color:#f0ece3"><strong>${order.userName}</strong></td></tr>
              <tr><td style="color:#888;padding:6px 0;font-size:.85rem">Email</td><td style="font-family:monospace;font-size:.8rem;color:#f0ece3">${order.userEmail}</td></tr>
              <tr><td style="color:#888;padding:6px 0;font-size:.85rem">Amount</td><td style="font-size:1.1rem;color:#00c864"><strong>$${order.totalAmount?.toFixed(2)}</strong></td></tr>
              <tr><td style="color:#888;padding:6px 0;font-size:.85rem">Payment</td><td><span style="background:${methodColor}22;color:${methodColor};padding:3px 10px;border-radius:2px;font-size:.8rem;font-family:monospace">${order.payMethod?.toUpperCase()}</span></td></tr>
              <tr><td style="color:#888;padding:6px 0;font-size:.85rem">License</td><td style="font-family:monospace;font-size:.8rem;color:#f0ece3">${order.license?.toUpperCase()}</td></tr>
              <tr><td style="color:#888;padding:6px 0;font-size:.85rem">Date</td><td style="font-size:.85rem;color:#f0ece3">${new Date(order.createdAt).toLocaleString()}</td></tr>
            </table>
          </div>

          <div style="background:#111;border:1px solid #222;padding:16px 20px;border-radius:4px;margin-bottom:20px">
            <p style="color:#888;font-size:.7rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Items Ordered</p>
            <p style="font-size:.9rem;line-height:1.8">${itemList}</p>
          </div>

          <div style="background:#1a0a00;border:1px solid #ff6b0033;padding:16px 20px;border-radius:4px;margin-bottom:24px">
            <p style="color:#ff9500;font-size:.75rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">⚡ Transaction Reference to Verify</p>
            <p style="font-family:monospace;font-size:1rem;color:#f0ece3;background:#000;padding:10px;border-radius:4px;word-break:break-all">${order.txRef}</p>
            <p style="color:#888;font-size:.8rem;margin-top:8px">
              Check your <strong style="color:${methodColor}">${order.payMethod?.toUpperCase()}</strong> account and verify this transaction reference.
            </p>
          </div>

          <div style="text-align:center;margin-bottom:16px">
            <a href="${process.env.CLIENT_URL}/admin.html" style="display:inline-block;background:#ff3c00;color:#fff;padding:14px 32px;text-decoration:none;font-size:.8rem;letter-spacing:2px;text-transform:uppercase;border-radius:2px">
              OPEN ADMIN PANEL →
            </a>
          </div>

          <p style="color:#555;font-size:.75rem;text-align:center;margin-top:24px">
            Go to Admin → Orders → Find this order → Click <strong>Confirm & Send Email</strong>
          </p>
        </div>
      `
    });

    console.log(`🔔 Admin notification sent for order ${order._id}`);
  } catch (err) {
    console.error('Admin email error:', err.message);
  }
}

// ── 2. EMAIL TO BUYER — order received, pending verification ─
async function sendOrderReceived(order) {
  try {
    const transporter = getTransporter();
    const methodColor = order.payMethod === 'wise' ? '#9fe870' : '#ff6b00';

    await transporter.sendMail({
      from: `"Shuki Production" <${process.env.EMAIL_USER}>`,
      to:   order.userEmail,
      subject: '⏳ Order received — Shuki Production',
      html: `
        <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#f0ece3;padding:40px;max-width:560px;margin:0 auto;border:1px solid #222">
          <h1 style="font-size:1.8rem;letter-spacing:3px;margin-bottom:4px">SHUKI<span style="color:#ff3c00">.</span></h1>
          <p style="color:#888;font-size:.75rem;letter-spacing:2px;margin-bottom:28px">PRODUCTION</p>

          <h2 style="color:#c9a84c;margin-bottom:16px">⏳ Order Received</h2>
          <p>Hey <strong>${order.userName}</strong>,</p>
          <p style="line-height:1.7;color:#ccc;margin-top:8px">
            We received your order and your <span style="color:${methodColor}">${order.payMethod?.toUpperCase()}</span> payment reference.
            We'll verify your payment within <strong>1–12 hours</strong> and send you a confirmation with download links.
          </p>

          <div style="background:#111;border:1px solid #222;padding:20px;border-radius:4px;margin:24px 0">
            <p style="color:#888;font-size:.7rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">Order Summary</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="color:#888;padding:5px 0;font-size:.85rem">Order ID</td><td style="font-family:monospace;font-size:.75rem">${order._id}</td></tr>
              <tr><td style="color:#888;padding:5px 0;font-size:.85rem">License</td><td style="font-size:.85rem">${order.license?.toUpperCase()}</td></tr>
              <tr><td style="color:#888;padding:5px 0;font-size:.85rem">Payment</td><td style="font-size:.85rem">${order.payMethod?.toUpperCase()}</td></tr>
              <tr><td style="color:#888;padding:5px 0;font-size:.85rem">Reference</td><td style="font-family:monospace;font-size:.75rem;word-break:break-all">${order.txRef}</td></tr>
              <tr><td style="color:#888;padding:5px 0;font-size:.85rem">Total</td><td style="color:#00c864;font-size:1rem"><strong>$${order.totalAmount?.toFixed(2)}</strong></td></tr>
            </table>
          </div>

          <p style="color:#888;font-size:.85rem;line-height:1.7">
            If you have any questions, reply to this email or DM us on Instagram.<br>
            Keep this email — your Order ID is needed for any support requests.
          </p>

          <p style="color:#555;font-size:.75rem;margin-top:32px;border-top:1px solid #222;padding-top:16px">
            Shuki Production · @andrejs1243
          </p>
        </div>
      `
    });

    console.log(`📧 Order received email sent to ${order.userEmail}`);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

// ── 3. EMAIL TO BUYER — payment confirmed, files ready ───────
async function sendOrderConfirmed(order) {
  try {
    const transporter = getTransporter();
    const itemList = order.items.map(i => `• ${i.beatName}`).join('<br>');

    await transporter.sendMail({
      from: `"Shuki Production" <${process.env.EMAIL_USER}>`,
      to:   order.userEmail,
      subject: '✅ Payment Confirmed — Your files are ready! — Shuki Production',
      html: `
        <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#f0ece3;padding:40px;max-width:560px;margin:0 auto;border:1px solid #222">
          <h1 style="font-size:1.8rem;letter-spacing:3px;margin-bottom:4px">SHUKI<span style="color:#ff3c00">.</span></h1>
          <p style="color:#888;font-size:.75rem;letter-spacing:2px;margin-bottom:28px">PRODUCTION</p>

          <h2 style="color:#00c864;margin-bottom:16px">✅ Payment Confirmed!</h2>
          <p>Hey <strong>${order.userName}</strong>,</p>
          <p style="line-height:1.7;color:#ccc;margin-top:8px">
            Your payment has been verified. Your files are now <strong style="color:#00c864">ready to download</strong> in your library!
          </p>

          <div style="background:#111;border:1px solid #00c86433;border-left:4px solid #00c864;padding:20px;border-radius:4px;margin:24px 0">
            <p style="color:#888;font-size:.7rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">Order Details</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="color:#888;padding:5px 0;font-size:.85rem">Order ID</td><td style="font-family:monospace;font-size:.75rem">${order._id}</td></tr>
              <tr><td style="color:#888;padding:5px 0;font-size:.85rem">License</td><td style="font-size:.85rem">${order.license?.toUpperCase()}</td></tr>
              <tr><td style="color:#888;padding:5px 0;font-size:.85rem">Amount</td><td style="color:#00c864;font-size:1rem"><strong>$${order.totalAmount?.toFixed(2)}</strong></td></tr>
              <tr><td style="color:#888;padding:5px 0;font-size:.85rem">Items</td><td style="font-size:.85rem;line-height:1.8">${itemList}</td></tr>
            </table>
          </div>

          <div style="text-align:center;margin:28px 0">
            <a href="${process.env.CLIENT_URL}" style="display:inline-block;background:#ff3c00;color:#fff;padding:14px 36px;text-decoration:none;font-size:.8rem;letter-spacing:2px;text-transform:uppercase;border-radius:2px">
              GO TO MY LIBRARY →
            </a>
          </div>

          <p style="color:#888;font-size:.85rem;line-height:1.7">
            Log in to your account → click <strong>"My Library"</strong> → download your files.<br><br>
            Thank you for your purchase! 🔥
          </p>

          <p style="color:#555;font-size:.75rem;margin-top:32px;border-top:1px solid #222;padding-top:16px">
            Shuki Production · @andrejs1243 · shundovskishuki1@gmail.com
          </p>
        </div>
      `
    });

    console.log(`📧 Confirmation email sent to ${order.userEmail}`);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

module.exports = { sendAdminNotification, sendOrderReceived, sendOrderConfirmed };
