import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  parentId: z.string().optional().or(z.literal('')),
});

const familyChildSelect = {
  id: true,
  name: true,
  phone: true,
  dateOfBirth: true,
};

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
      parentId: true,
      parent: { select: { id: true, name: true } },
      _count: { select: { orders: true, examinations: true } },
    },
  });
  return res.json(customers);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      parent: { select: familyChildSelect },
      children: { select: familyChildSelect, orderBy: { name: 'asc' } },
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

  const { phone, parentId, ...rest } = parse.data;

  // if (phone) {
  //   const existing = await prisma.customer.findFirst({ where: { phone } });
  //   if (existing) return res.status(409).json({ message: 'Customer with this phone already exists' });
  // }

  if (parentId) {
    const parent = await prisma.customer.findUnique({ where: { id: parentId } });
    if (!parent) return res.status(404).json({ message: 'Parent customer not found' });
  }

  const customer = await prisma.customer.create({
    data: {
      ...rest,
      phone: phone || null,
      email: rest.email || null,
      dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : null,
      parentId: parentId || null,
    },
  });
  return res.status(201).json(customer);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const parse = customerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input' });

  const { phone, parentId, ...rest } = parse.data;

  if (phone) {
    const existing = await prisma.customer.findFirst({
      where: { phone, NOT: { id: req.params.id } },
    });
    if (existing) return res.status(409).json({ message: 'Phone number already in use' });
  }

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      phone: phone || null,
      email: rest.email || null,
      dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : null,
    },
  });
  return res.json(customer);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.customer.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Deleted' });
});

// Link an existing customer as a child of this customer
router.post('/:id/children', async (req: AuthRequest, res: Response) => {
  const parentId = req.params.id;
  const { childId } = req.body;

  if (!childId) return res.status(400).json({ message: 'childId is required' });
  if (childId === parentId) return res.status(400).json({ message: 'A customer cannot be their own family member' });

  const [parent, child] = await Promise.all([
    prisma.customer.findUnique({ where: { id: parentId } }),
    prisma.customer.findUnique({ where: { id: childId } }),
  ]);

  if (!parent) return res.status(404).json({ message: 'Parent customer not found' });
  if (!child) return res.status(404).json({ message: 'Child customer not found' });

  // Prevent circular: check that parentId is not a descendant of childId
  if (child.parentId === parentId) {
    return res.status(409).json({ message: 'Already linked as a family member' });
  }

  const updated = await prisma.customer.update({
    where: { id: childId },
    data: { parentId },
    select: familyChildSelect,
  });

  return res.json(updated);
});

// Unlink a child from this customer
router.delete('/:id/children/:childId', async (req: AuthRequest, res: Response) => {
  const { id: parentId, childId } = req.params;

  const child = await prisma.customer.findUnique({ where: { id: childId } });
  if (!child) return res.status(404).json({ message: 'Customer not found' });
  if (child.parentId !== parentId) return res.status(400).json({ message: 'This customer is not a child of the given parent' });

  await prisma.customer.update({
    where: { id: childId },
    data: { parentId: null },
  });

  return res.json({ message: 'Unlinked' });
});

export default router;
