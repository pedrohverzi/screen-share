require('dotenv').config();
const express = require('express');
const { generateToken } = require('./lib/generateToken');

const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, PORT = 3000 } = process.env;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error('Faltam variaveis de ambiente. Copie .env.example para .env e preencha com os dados do seu projeto LiveKit Cloud.');
  if (require.main === module) process.exit(1);
}

const app = express();
app.use(express.json());
// So usado em dev local (node server.js). No Vercel, express.static() e ignorado
// e os arquivos de public/ sao servidos direto pelo CDN.
app.use(express.static('public'));

app.get('/api/config', (_req, res) => {
  res.json({ livekitUrl: LIVEKIT_URL });
});

app.post('/api/token', async (req, res) => {
  const { room, identity } = req.body || {};

  if (!room || !identity) {
    return res.status(400).json({ error: 'room e identity sao obrigatorios' });
  }

  const token = await generateToken({
    apiKey: LIVEKIT_API_KEY,
    apiSecret: LIVEKIT_API_SECRET,
    room,
    identity,
  });
  res.json({ token });
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}
