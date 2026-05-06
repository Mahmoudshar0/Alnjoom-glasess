import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const examSchema = z.object({
  customerId: z.string(),
  doctor: z.string().optional(),
  date: z.string().optional(),
  rightSph: z.number().optional().nullable(),
  rightCyl: z.number().optional().nullable(),
  rightAxis: z.number().int().optional().nullable(),
  leftSph: z.number().optional().nullable(),
  leftCyl: z.number().optional().nullable(),
  leftAxis: z.number().int().optional().nullable(),
  add: z.number().optional().nullable(),
  ipd: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  notes: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const q = req.query.q as string | undefined;
  const exams = await prisma.examination.findMany({
    where: q
      ? {
          customer: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          },
        }
      : undefined,
    orderBy: { date: 'desc' },
    include: { customer: { select: { id: true, name: true, phone: true } } },
    take: 200,
  });
  return res.json(exams);
});

router.get('/customer/:customerId', async (req: AuthRequest, res: Response) => {
  const exams = await prisma.examination.findMany({
    where: { customerId: req.params.customerId },
    orderBy: { date: 'desc' },
  });
  return res.json(exams);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const exam = await prisma.examination.findUnique({ where: { id: req.params.id } });
  if (!exam) return res.status(404).json({ message: 'Examination not found' });
  return res.json(exam);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parse = examSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input', errors: parse.error.issues });
  const { date, ...rest } = parse.data;
  const exam = await prisma.examination.create({
    data: { ...rest, date: date ? new Date(date) : new Date() },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });
  return res.status(201).json(exam);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const parse = examSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Invalid input' });
  const { date, ...rest } = parse.data;
  const exam = await prisma.examination.update({
    where: { id: req.params.id },
    data: { ...rest, date: date ? new Date(date) : undefined },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });
  return res.json(exam);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.examination.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Deleted' });
});

export default router;
