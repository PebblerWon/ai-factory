import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

import { initDatabase, closeDatabase, saveDatabase } from './sqlite';
import authRoutes from './routes/auth';
import nodeRoutes from './routes/nodes';
import taskRoutes from './routes/tasks';
import walletRoutes from './routes/wallet';
import adminRoutes from './routes/admin';
import apiKeyRoutes from './routes/api-keys';

const app = express();

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function startServer() {
  try {
    await initDatabase();

    app.use('/api/auth', authRoutes);
    app.use('/api/nodes', nodeRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/wallet', walletRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/api-keys', apiKeyRoutes);

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database path: ${path.join(dataDir, 'aifactory.db')}`);
    });

    setInterval(() => {
      saveDatabase();
      console.log('Database auto-saved');
    }, 30000);

    process.on('SIGINT', () => {
      console.log('\nSaving database before exit...');
      closeDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\nSaving database before exit...');
      closeDatabase();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
