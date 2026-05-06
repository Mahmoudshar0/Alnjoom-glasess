import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const q = req.query.q as string | undefined;
  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      createdAt: true,
      _count: { select: { orders: true, examinations: true } },
    },
  });
  return res.json(customers);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      examinations: { orderBy: { date: 'desc' } },
      orders: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { inventoryItem: true } },
          invoice: true,
          examination: true,
        },
      },
      invoices: { orderBy: { createdAt: 'desc' }, include: { payments: true } },
    },
  });
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  return res.json(customer);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parse = customerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input', errors: parse.error.issues });

  const existing = await prisma.customer.findUnique({ where: { phone: parse.data.phone } });
  if (existing) return res.status(409).json({ message: 'Customer with this phone already exists' });

  const customer = await prisma.customer.create({
    data: {
      ...parse.data,
      email: parse.data.email || null,
      dateOfBirth: parse.data.dateOfBirth ? new Date(parse.data.dateOfBirth) : null,
    },
  });
  return res.status(201).json(customer);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const parse = customerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input' });

  const existing = await prisma.customer.findFirst({
    where: { phone: parse.data.phone, NOT: { id: req.params.id } },
  });
  if (existing) return res.status(409).json({ message: 'Phone number already in use' });

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: {
      ...parse.data,
      email: parse.data.email || null,
      dateOfBirth: parse.data.dateOfBirth ? new Date(parse.data.dateOfBirth) : null,
    },
  });
  return res.json(customer);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.customer.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Deleted' });
});

export default router;
