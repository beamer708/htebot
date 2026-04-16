module.exports = (req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return res.status(503).json({
      success: false,
      error: 'The HowToERLC API is currently undergoing maintenance. Please try again later.',
    });
  }
  next();
};
