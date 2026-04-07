export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
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
        html: `
          <div style="background:#0a0b0d;color:#e8dfc8;padding:40px;font-family:sans-serif;max-width:480px;margin:0 auto;">
            <div style="color:#c9a84c;font-size:12px;letter-spacing:0.3em;margin-bottom:24px;">THROUGHLINE</div>
            <h1 style="font-size:28px;margin:0 0 16px;">Every vote has a price.</h1>
            <p style="color:#a89d88;line-height:1.6;margin:0 0 32px;">Thanks for signing up. You're now part of a growing group of people who want to see the money behind every congressional vote.</p>
            <p style="color:#a89d88;line-height:1.6;margin:0 0 32px;">Click the link Supabase sent you to confirm your account, then take the quiz to find your political thumbprint.</p>
            <div style="border-top:1px solid rgba(201,168,76,0.2);margin-top:32px;padding-top:16px;">
              <p style="color:#a89d88;font-size:11px;margin:0;">throughline-next.vercel.app · Free, no ads, no spin.</p>
            </div>
          </div>
        `,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Resend error');
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
