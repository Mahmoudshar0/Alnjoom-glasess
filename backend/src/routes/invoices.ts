import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const invoiceSchema = z.object({
  orderId: z.string(),
  customerId: z.string(),
  totalAmount: z.number().min(0),
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

router.get('/', async (req: AuthRequest, res: Response) => {
  const status = req.query.status as string | undefined;
  const customerId = req.query.customerId as string | undefined;
  const invoices = await prisma.invoice.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(customerId ? { customerId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      order: { include: { items: true } },
      payments: true,
    },
  });
  return res.json(invoices);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      order: { include: { items: { include: { inventoryItem: true } }, examination: true } },
      payments: true,
    },
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  return res.json(invoice);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parse = invoiceSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input', errors: parse.error.issues });

  const status =
    parse.data.paidAmount >= parse.data.totalAmount
      ? 'PAID'
      : parse.data.paidAmount > 0
      ? 'PARTIAL'
      : 'UNPAID';

  const invoice = await prisma.invoice.create({
    data: { ...parse.data, status },
    include: { customer: { select: { id: true, name: true } }, payments: true },
  });
  return res.status(201).json(invoice);
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
  const parse = invoiceSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input' });

  const current = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ message: 'Invoice not found' });

  const totalAmount = parse.data.totalAmount ?? current.totalAmount;
  const paidAmount = parse.data.paidAmount ?? current.paidAmount;
  const status = paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

  const invoice = await prisma.invoice.update({
    where: { id: req.params.id },
    data: { ...parse.data, status },
  });
  return res.json(invoice);
});

export default router;
