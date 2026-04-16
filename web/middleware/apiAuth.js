module.exports = (req, res, next) => {
  const secret = req.headers['x-api-secret'];
  if (!secret || secret !== process.env.API_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized: invalid or missing X-API-SECRET header.' });
  }
  next();
};
