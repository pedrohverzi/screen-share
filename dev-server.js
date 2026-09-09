require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { generateToken } = require('./lib/generateToken');

const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, PORT = 3000 } = process.env;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error('Faltam variaveis de ambiente. Copie .env.example para .env e preencha com os dados do seu projeto LiveKit Cloud.');
  process.exit(1);
}

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(PUBLIC_DIR, decodeURIComponent(urlPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/config') {
    sendJson(res, 200, { livekitUrl: LIVEKIT_URL });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/token') {
    let payload;
    try {
      payload = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: 'JSON invalido' });
      return;
    }

    const { room, identity } = payload;
    if (!room || !identity) {
      sendJson(res, 400, { error: 'room e identity sao obrigatorios' });
      return;
    }

    const token = await generateToken({ apiKey: LIVEKIT_API_KEY, apiSecret: LIVEKIT_API_SECRET, room, identity });
    sendJson(res, 200, { token });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
