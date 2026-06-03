const { Resend } = require('resend');

const ADMIN_EMAIL = 'shundovskishuki1@gmail.com';
const FROM_EMAIL  = 'Shuki Production <onboarding@resend.dev>';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// Тест при старт на серверот
async function testEmail() {
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not set!');
    return;
  }
  console.log('✅ Resend email service ready');
}

// Email до Admin — нова нарачка
async function sendAdminNotification(order) {
  try {
    const resend = getResend();
    const items  = order.items.map(i => `• ${i.beatName} — $${i.price?.toFixed(2)}`).join('<br>');
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      ADMIN_EMAIL,
      subject: `🔔 New Order — $${order.totalAmount?.toFixed(2)} via ${order.payMethod?.toUpperCase()}`,
      html: `
        <div style="font-family:Arial;background:#0a0a0a;color:#f0ece3;padding:40px;max-width:560px">
          <h2 style="color:#ff3c00">🔔 NEW ORDER RECEIVED</h2>
          <p><b>Buyer:</b> ${order.userName} &lt;${order.userEmail}&gt;</p>
          <p><b>Amount:</b> <span style="color:#00c864">$${order.totalAmount?.toFixed(2)}</span></p>
          <p><b>Method:</b> ${order.payMethod?.toUpperCase()}</p>
          <p><b>License:</b> ${order.license?.toUpperCase()}</p>
          <p><b>Tx Ref:</b> <code style="background:#222;padding:4px 8px;border-radius:4px">${order.txRef}</code></p>
          <p><b>Items:</b><br>${items}</p>
          <br>
          <a href="${process.env.CLIENT_URL}/admin.html"
             style="background:#ff3c00;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold">
            OPEN ADMIN PANEL →
          </a>
        </div>`
    });
    console.log('✅ Admin notification sent');
  } catch(e) {
    console.error('❌ Admin email error:', e.message);
  }
}

// Email до купувачот — нарачката е примена
async function sendOrderReceived(order) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      order.userEmail,
      subject: '⏳ Order received — Shuki Production',
      html: `
        <div style="font-family:Arial;background:#0a0a0a;color:#f0ece3;padding:40px;max-width:560px">
          <h2 style="color:#c9a84c">⏳ Order Received!</h2>
          <p>Hey <b>${order.userName}</b>,</p>
          <p>We received your order and payment reference.<br>
             We'll verify within <b>1–12 hours</b> and unlock your files.</p>
          <p><b>Order ID:</b> ${order._id}</p>
          <p><b>Total:</b> $${order.totalAmount?.toFixed(2)}</p>
          <p><b>Method:</b> ${order.payMethod?.toUpperCase()}</p>
          <p><b>Reference:</b> ${order.txRef}</p>
          <br><p style="color:#888">Thank you! — Shuki Production</p>
        </div>`
    });
    console.log('✅ Order received email sent to', order.userEmail);
  } catch(e) {
    console.error('❌ Order received email error:', e.message);
  }
}

// Email до купувачот — плаќањето е потврдено
async function sendOrderConfirmed(order) {
  try {
    const resend = getResend();
    const items  = order.items.map(i => `• ${i.beatName}`).join('<br>');
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      order.userEmail,
      subject: '✅ Payment Confirmed — Your files are ready!',
      html: `
        <div style="font-family:Arial;background:#0a0a0a;color:#f0ece3;padding:40px;max-width:560px">
          <h2 style="color:#00c864">✅ Payment Confirmed!</h2>
          <p>Hey <b>${order.userName}</b>, your files are ready!</p>
          <p><b>Items:</b><br>${items}</p>
          <p><b>License:</b> ${order.license?.toUpperCase()}</p>
          <br>
          <a href="${process.env.CLIENT_URL}"
             style="background:#ff3c00;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold">
            GO TO MY LIBRARY →
          </a>
          <br><br>
          <p style="color:#888">Log in → My Library → Download. — Shuki Production</p>
        </div>`
    });
    console.log('✅ Confirmation email sent to', order.userEmail);
  } catch(e) {
    console.error('❌ Confirmation email error:', e.message);
  }
}

module.exports = { testEmail, sendAdminNotification, sendOrderReceived, sendOrderConfirmed };