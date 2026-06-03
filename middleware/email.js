const https = require('https');

const ADMIN_EMAIL = 'shundovskishuki1@gmail.com';
const FROM_EMAIL  = 'shundovskishuki1@gmail.com';
const FROM_NAME   = 'Shuki Production';

// Испрати email преку SendGrid API
function sendEmail(to, subject, html) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [{ type: 'text/html', value: html }]
    });

    const options = {
      hostname: 'api.sendgrid.com',
      path:     '/v3/mail/send',
      method:   'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, res => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => reject(new Error(`SendGrid ${res.statusCode}: ${data}`)));
      }
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Тест при старт
async function testEmail() {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY not set!');
  } else {
    console.log('✅ SendGrid email service ready');
  }
}

// Email до Admin — нова нарачка
async function sendAdminNotification(order) {
  try {
    const items = order.items.map(i => `• ${i.beatName} — $${i.price?.toFixed(2)}`).join('<br>');
    await sendEmail(
      ADMIN_EMAIL,
      `🔔 New Order — $${order.totalAmount?.toFixed(2)} via ${order.payMethod?.toUpperCase()}`,
      `<div style="font-family:Arial;background:#0a0a0a;color:#f0ece3;padding:40px;max-width:560px">
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
    );
    console.log('✅ Admin notification sent');
  } catch(e) {
    console.error('❌ Admin email error:', e.message);
  }
}

// Email до купувачот — нарачката е примена
async function sendOrderReceived(order) {
  try {
    await sendEmail(
      order.userEmail,
      '⏳ Order received — Shuki Production',
      `<div style="font-family:Arial;background:#0a0a0a;color:#f0ece3;padding:40px;max-width:560px">
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
    );
    console.log('✅ Order received email sent to', order.userEmail);
  } catch(e) {
    console.error('❌ Order received email error:', e.message);
  }
}

// Email до купувачот — плаќањето е потврдено
async function sendOrderConfirmed(order) {
  try {
    const items = order.items.map(i => `• ${i.beatName}`).join('<br>');
    await sendEmail(
      order.userEmail,
      '✅ Payment Confirmed — Your files are ready!',
      `<div style="font-family:Arial;background:#0a0a0a;color:#f0ece3;padding:40px;max-width:560px">
        <h2 style="color:#00c864">✅ Payment Confirmed!</h2>
        <p>Hey <b>${order.userName}</b>, your files are ready to download!</p>
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
    );
    console.log('✅ Confirmation email sent to', order.userEmail);
  } catch(e) {
    console.error('❌ Confirmation email error:', e.message);
  }
}

module.exports = { testEmail, sendAdminNotification, sendOrderReceived, sendOrderConfirmed };
