const { AccessToken } = require('livekit-server-sdk');

async function generateToken({ apiKey, apiSecret, room, identity }) {
  const at = new AccessToken(apiKey, apiSecret, { identity, ttl: '4h' });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
  });
  return at.toJwt();
}

module.exports = { generateToken };
