import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const orderItemSchema = z.object({
  inventoryItemId: z.string().optional().nullable(),
  customItemName: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  price: z.number().min(0),
  notes: z.string().optional(),
});

const orderSchema = z.object({
  customerId: z.string(),
  examinationId: z.string().optional().nullable(),
  status: z.enum(['NEW', 'IN_PROGRESS', 'READY', 'DELIVERED']).default('NEW'),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const status = req.query.status as string | undefined;
  const customerId = req.query.customerId as string | undefined;
  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(customerId ? { customerId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: { include: { inventoryItem: true } },
      invoice: true,
      examination: true,
    },
  });
  return res.json(orders);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      items: { include: { inventoryItem: true } },
      invoice: { include: { payments: true } },
      examination: true,
    },
  });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  return res.json(order);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parse = orderSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input', errors: parse.error.issues });

  const { items, ...orderData } = parse.data;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        ...orderData,
        items: { create: items },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { inventoryItem: true } },
      },
    });

    // Decrement inventory for items linked to inventory records
    for (const item of items) {
      if (item.inventoryItemId) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: { decrement: item.quantity } },
        }).catch(() => {
          // Inventory item may have been deleted — skip silently
        });
      }
    }

    return created;
  });

  return res.status(201).json(order);
});

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const validStatuses = ['NEW', 'IN_PROGRESS', 'READY', 'DELIVERED'];
  if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
    include: { customer: { select: { id: true, name: true } } },
  });
  return res.json(order);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const parse = orderSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input' });

  const { items, ...orderData } = parse.data;

  await prisma.$transaction(async (tx) => {
    // Restore inventory for old items before replacing them
    const oldItems = await tx.orderItem.findMany({ where: { orderId: req.params.id } });
    for (const item of oldItems) {
      if (item.inventoryItemId) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: { increment: item.quantity } },
        }).catch(() => {});
      }
    }

    // Replace items
    await tx.orderItem.deleteMany({ where: { orderId: req.params.id } });
    await tx.order.update({
      where: { id: req.params.id },
      data: { ...orderData, items: { create: items } },
    });

    // Decrement inventory for new items
    for (const item of items) {
      if (item.inventoryItemId) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: { decrement: item.quantity } },
        }).catch(() => {});
      }
    }
  });

  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { customer: true, items: { include: { inventoryItem: true } } },
  });
  return res.json(order);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.$transaction(async (tx) => {
    // Restore inventory quantities before deleting
    const items = await tx.orderItem.findMany({ where: { orderId: req.params.id } });
    for (const item of items) {
      if (item.inventoryItemId) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: { increment: item.quantity } },
        }).catch(() => {});
      }
    }

    await tx.order.delete({ where: { id: req.params.id } });
  });

  return res.json({ message: 'Deleted' });
});

export default router;
