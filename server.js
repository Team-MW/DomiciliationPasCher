// server.js
import express from 'express';
import cors from 'cors';
import { handler as updateClientExtra } from './src/pages/api/update-client-extra.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/update-client-extra', async (req, res) => {
  try {
    await updateClientExtra(req, res);
  } catch (err) {
    console.error('[API Server] Unexpected error:', err);
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
});

const PORT = process.env.PORT || 5174;
app.listen(PORT, () => {
  console.log(`[API Server] listening on http://localhost:${PORT}`);
});
