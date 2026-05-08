import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const invoiceSchema = z.object({
  customerId: z.string(),
  orderIds: z.array(z.string()).min(1, 'At least one order is required'),
  paidAmount: z.number().min(0).default(0),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

const paymentSchema = z.object({
  amount: z.number().min(0),
  method: z.string(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

const invoiceInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  orders: {
    include: {
      items: { include: { inventoryItem: true } },
      examination: true,
    },
  },
  payments: true,
};

router.get('/', async (req: AuthRequest, res: Response) => {
  const status = req.query.status as string | undefined;
  const customerId = req.query.customerId as string | undefined;
  const invoices = await prisma.invoice.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(customerId ? { customerId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: invoiceInclude,
  });
  return res.json(invoices);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: invoiceInclude,
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  return res.json(invoice);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parse = invoiceSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input', errors: parse.error.issues });

  const { customerId, orderIds, paidAmount, paymentMethod, notes } = parse.data;

  // Verify all orders belong to this customer and are uninvoiced
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, customerId },
    include: { items: true },
  });

  if (orders.length !== orderIds.length) {
    return res.status(400).json({ message: 'Some orders were not found or do not belong to this customer' });
  }

  const alreadyInvoiced = orders.filter(o => o.invoiceId);
  if (alreadyInvoiced.length > 0) {
    return res.status(400).json({ message: 'Some selected orders are already included in another invoice' });
  }

  const totalAmount = orders.reduce((sum, order) =>
    sum + order.items.reduce((s, item) => s + item.price * item.quantity, 0), 0
  );

  const status = paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: { customerId, totalAmount, paidAmount, paymentMethod, status, notes },
    });

    // Link all orders to this invoice
    await tx.order.updateMany({
      where: { id: { in: orderIds } },
      data: { invoiceId: inv.id },
    });

    // Record initial payment in history if paid upfront
    if (paidAmount > 0) {
      await tx.payment.create({
        data: {
          invoiceId: inv.id,
          amount: paidAmount,
          method: paymentMethod ?? 'Cash',
          notes: 'Initial payment',
        },
      });
    }

    return inv;
  });

  const full = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: invoiceInclude,
  });
  return res.status(201).json(full);
});

router.post('/:id/payments', async (req: AuthRequest, res: Response) => {
  const parse = paymentSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input' });

  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  const payment = await prisma.payment.create({
    data: {
      invoiceId: req.params.id,
      ...parse.data,
      date: parse.data.date ? new Date(parse.data.date) : new Date(),
    },
  });

  const allPayments = await prisma.payment.findMany({ where: { invoiceId: req.params.id } });
  const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const newStatus = totalPaid >= invoice.totalAmount ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID';

  await prisma.invoice.update({
    where: { id: req.params.id },
    data: { paidAmount: totalPaid, status: newStatus },
  });

  return res.status(201).json(payment);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const parse = z.object({
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
  }).safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input' });

  const invoice = await prisma.invoice.update({
    where: { id: req.params.id },
    data: parse.data,
    include: invoiceInclude,
  });
  return res.json(invoice);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  await prisma.$transaction(async (tx) => {
    // Unlink orders so they can be re-invoiced
    await tx.order.updateMany({
      where: { invoiceId: req.params.id },
      data: { invoiceId: null },
    });
    await tx.invoice.delete({ where: { id: req.params.id } });
  });

  return res.json({ message: 'Deleted' });
});

export default router;
