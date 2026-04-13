import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import { authRouter } from './routes/auth';
import { addressesRouter } from './routes/addresses';
import { documentRouter } from './routes/document';

const app = express();

connectDB();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api', documentRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
