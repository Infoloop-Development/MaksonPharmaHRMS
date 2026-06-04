import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDb(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  logger.info(`MongoDB connected: ${env.MONGO_URI.replace(/\/\/[^@]+@/, '//***@')}`);
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
