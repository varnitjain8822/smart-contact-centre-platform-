import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let server;
export async function startDb() {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}
export async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}
export async function stopDb() { await mongoose.disconnect(); await server?.stop(); }
