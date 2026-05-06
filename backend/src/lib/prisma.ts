import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// Explicit path so this works regardless of cwd (PM2, ts-node, compiled node)
// __dirname in dist/lib/prisma.js resolves to backend/dist/lib → ../../.env = backend/.env
if (!process.env.DATABASE_URL) {
  config({ path: resolve(__dirname, '../../.env') });
}

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });
export default prisma;
