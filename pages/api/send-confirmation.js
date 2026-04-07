export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  console.log('send-confirmation called for:', email);
  console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
  console.log('RESEND_API_KEY prefix:', process.env.RESEND_API_KEY?.substring(0, 8));

  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Throughline <noreply@throughlinenews.org>',
        to: email,
        subject: 'Confirm your Throughline account',
        html: '<p>Welcome to Throughline.</p>',
      }),
    });

    const data = await response.json();
    console.log('Resend response status:', response.status);
    console.log('Resend response data:', JSON.stringify(data));

    if (!response.ok) throw new Error(data.message || JSON.stringify(data));
    res.status(200).json({ success: true });
  } catch (e) {
    console.error('send-confirmation error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
