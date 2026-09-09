const { generateToken } = require('../lib/generateToken');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { room, identity } = req.body || {};
  if (!room || !identity) {
    res.status(400).json({ error: 'room e identity sao obrigatorios' });
    return;
  }

  const token = await generateToken({
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    room,
    identity,
  });

  res.status(200).json({ token });
};
