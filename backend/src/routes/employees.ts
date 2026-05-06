import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'EMPLOYEE']).default('EMPLOYEE'),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
  isActive: z.boolean().optional(),
});

router.get('/', async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(users);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input', errors: parse.error.issues });

  const existing = await prisma.user.findUnique({ where: { email: parse.data.email } });
  if (existing) return res.status(409).json({ message: 'Email already in use' });

  const passwordHash = await bcrypt.hash(parse.data.password, 10);
  const user = await prisma.user.create({
    data: { name: parse.data.name, email: parse.data.email, passwordHash, role: parse.data.role },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  return res.status(201).json(user);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input' });

  const { password, ...rest } = parse.data;
  const updateData: any = { ...rest };
  if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  return res.json(user);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  if (req.user!.id === req.params.id) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Deleted' });
});

export default router;
