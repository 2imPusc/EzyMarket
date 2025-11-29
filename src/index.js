import 'dotenv/config';
import express from 'express';
import connectDB from './config/db.js';
import bodyParser from 'body-parser';
import cors from 'cors';
import authRoutes from './routes/authRoute.js';
import groupRoutes from './routes/groupRoute.js';
import ingredientRoutes from './routes/ingredientRoute.js';
import unitRoutes from './routes/unitRoute.js';
import recipeRoutes from './routes/recipeRoute.js';
import tagRoutes from './routes/tagRoute.js';
import fridgeRoutes from './routes/fridgeRoute.js';
import mealPlanRoutes from './routes/mealPlanRoute.js';
import shoppingRoutes from './routes/shoppingRoute.js';
import { swaggerUi, swaggerSpec } from './config/swagger.js';
import uploadRouter from './routes/upload.routes.js';

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/user', authRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/fridges', fridgeRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/shopping-lists', shoppingRoutes);
app.use('/api/uploadthing', uploadRouter);

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
