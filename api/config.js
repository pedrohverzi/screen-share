module.exports = (req, res) => {
  res.status(200).json({ livekitUrl: process.env.LIVEKIT_URL });
};
