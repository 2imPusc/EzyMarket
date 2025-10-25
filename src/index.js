import 'dotenv/config';
import express from 'express';
import connectDB from './config/db.js';
import bodyParser from 'body-parser';
import cors from 'cors';
import authRoutes from './routes/authRoute.js';
import groupRoutes from './routes/groupRoute.js';

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start application due to DB error:', error);
    process.exit(1);
  }
})();

export default app;
