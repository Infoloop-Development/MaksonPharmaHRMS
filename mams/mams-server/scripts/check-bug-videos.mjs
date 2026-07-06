import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI missing');
  process.exit(1);
}

const root = path.resolve(process.env.BUG_REPORT_MEDIA_DIR || './data/bug-reports');
console.log('Media root:', root);

await mongoose.connect(uri);
const col = mongoose.connection.collection('bugreports');
const docs = await col
  .find({ 'video.filePath': { $exists: true, $ne: null } })
  .sort({ createdAt: -1 })
  .limit(15)
  .toArray();

for (const d of docs) {
  const fp = d.video?.filePath;
  const abs = path.join(root, String(fp).replace(/\\/g, '/'));
  const exists = fs.existsSync(abs);
  console.log(`${exists ? 'OK     ' : 'MISSING'} ${d._id}  ${fp}`);
}

await mongoose.disconnect();
