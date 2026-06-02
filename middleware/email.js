const nodemailer = require('nodemailer');

const ADMIN_EMAIL = 'shundovskishuki1@gmail.com';

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
}

async function sendAdminNotification(order) {
  try {
    const t = getTransporter();
    const items = order.items.map(i => `• ${i.beatName} — $${i.price?.toFixed(2)}`).join('<br>');
    await t.sendMail({
      from: `"Shuki Production" <${process.env.EMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `🔔 New Order — $${order.totalAmount?.toFixed(2)} via ${order.payMethod?.toUpperCase()}`,
      html: `<div style="font-family:Arial;background:#0a0a0a;color:#f0ece3;padding:40px;max-width:560px">
        <h2 style="color:#ff3c00">🔔 NEW ORDER</h2>
        <p><b>Buyer:</b> ${order.userName} &lt;${order.userEmail}&gt;</p>
        <p><b>Amount:</b> <span style="color:#00c864">$${order.totalAmount?.toFixed(2)}</span></p>
        <p><b>Method:</b> ${order.payMethod?.toUpperCase()}</p>
        <p><b>License:</b> ${order.license?.toUpperCase()}</p>
        <p><b>Tx Ref:</b> <code style="background:#222;padding:4px 8px">${order.txRef}</code></p>
        <p><b>Items:</b><br>${items}</p>
        <br><a href="${process.env.CLIENT_URL}/admin.html" style="background:#ff3c00;color:#fff;padding:12px 24px;text-decoration:none;border-radius:2px">OPEN ADMIN PANEL</a>
      </div>`
    });
  } catch(e) { console.error('Admin email error:', e.message); }
}

async function sendOrderReceived(order) {
  try {
    const t = getTransporter();
    await t.sendMail({
      from: `"Shuki Production" <${process.env.EMAIL_USER}>`,
      to: order.userEmail,
      subject: '⏳ Order received — Shuki Production',
      html: `<div style="font-family:Arial;background:#0a0a0a;color:#f0ece3;padding:40px;max-width:560px">
        <h2 style="color:#c9a84c">⏳ Order Received</h2>
        <p>Hey <b>${order.userName}</b>,</p>
        <p>We received your order and payment reference. We'll verify within <b>1–12 hours</b>.</p>
        <p><b>Order ID:</b> ${order._id}</p>
        <p><b>Total:</b> $${order.totalAmount?.toFixed(2)}</p>
        <p><b>Method:</b> ${order.payMethod?.toUpperCase()}</p>
        <p><b>Reference:</b> ${order.txRef}</p>
        <br><p style="color:#888">Thank you! — Shuki Production</p>
      </div>`
    });
  } catch(e) { console.error('Email error:', e.message); }
}

async function sendOrderConfirmed(order) {
  try {
    const t = getTransporter();
    const items = order.items.map(i => `• ${i.beatName}`).join('<br>');
    await t.sendMail({
      from: `"Shuki Production" <${process.env.EMAIL_USER}>`,
      to: order.userEmail,
      subject: '✅ Payment Confirmed — Your files are ready! — Shuki Production',
      html: `<div style="font-family:Arial;background:#0a0a0a;color:#f0ece3;padding:40px;max-width:560px">
        <h2 style="color:#00c864">✅ Payment Confirmed!</h2>
        <p>Hey <b>${order.userName}</b>, your files are ready to download!</p>
        <p><b>Items:</b><br>${items}</p>
        <p><b>License:</b> ${order.license?.toUpperCase()}</p>
        <br><a href="${process.env.CLIENT_URL}" style="background:#ff3c00;color:#fff;padding:12px 24px;text-decoration:none;border-radius:2px">GO TO MY LIBRARY</a>
        <br><br><p style="color:#888">Log in → My Library → Download. — Shuki Production</p>
      </div>`
    });
  } catch(e) { console.error('Email error:', e.message); }
}

module.exports = { sendAdminNotification, sendOrderReceived, sendOrderConfirmed };
