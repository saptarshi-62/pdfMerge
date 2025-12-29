// Re-export the Express app so Vercel can treat this as a Serverless Function
// This file must live under `api/` for the `functions` pattern to match.

const app = require('../server');

module.exports = app;