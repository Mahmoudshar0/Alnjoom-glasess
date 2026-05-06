import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const itemSchema = z.object({
  type: z.enum(['FRAME', 'LENS', 'ACCESSORY']),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  lensType: z.string().optional(),
  coating: z.string().optional(),
  lensIndex: z.number().optional().nullable(),
  category: z.string().optional(),
  price: z.number().min(0),
  quantity: z.number().int().min(0),
  sku: z.string().optional(),
  notes: z.string().optional(),
});

const SKU_PREFIX: Record<string, string> = { FRAME: 'FRM', LENS: 'LNS', ACCESSORY: 'ACC' };

const dupSkuError = (res: Response) =>
  res.status(409).json({ message: 'This SKU already exists. Please choose another SKU.', field: 'sku' });

// These special routes must come before /:id
router.get('/check-sku', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sku = (req.query.sku as string)?.trim();
    const excludeId = req.query.excludeId as string | undefined;
    if (!sku) return res.json({ available: true });
    const existing = await prisma.inventoryItem.findFirst({
      where: { sku, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    return res.json({ available: !existing });
  } catch (err) { return next(err); }
});

router.get('/generate-sku', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type as string;
    const prefix = SKU_PREFIX[type] ?? 'ITM';
    const existing = await prisma.inventoryItem.findMany({
      where: { sku: { startsWith: `${prefix}-` } },
      select: { sku: true },
    });
    const pattern = new RegExp(`^${prefix}-(\\d+)$`);
    const nums = existing
      .map(i => i.sku?.match(pattern)?.[1])
      .filter(Boolean)
      .map(n => parseInt(n!, 10));
    let seq = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    let candidate: string;
    // Increment until we find a free slot (handles gaps from manual SKUs)
    do {
      candidate = `${prefix}-${String(seq).padStart(4, '0')}`;
      const taken = await prisma.inventoryItem.findFirst({ where: { sku: candidate } });
      if (!taken) break;
      seq++;
    } while (true);
    return res.json({ sku: candidate });
  } catch (err) { return next(err); }
});

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type as string | undefined;
    const q = req.query.q as string | undefined;
    const items = await prisma.inventoryItem.findMany({
      where: {
        ...(type ? { type: type as 'FRAME' | 'LENS' | 'ACCESSORY' } : {}),
        ...(q ? { OR: [{ brand: { contains: q, mode: 'insensitive' } }, { model: { contains: q, mode: 'insensitive' } }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(items);
  } catch (err) { return next(err); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    return res.json(item);
  } catch (err) { return next(err); }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parse = itemSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: 'Invalid input', errors: parse.error.issues });

    if (parse.data.sku) {
      const conflict = await prisma.inventoryItem.findFirst({ where: { sku: parse.data.sku } });
      if (conflict) return dupSkuError(res);
    }

    const item = await prisma.inventoryItem.create({ data: parse.data });
    return res.status(201).json(item);
  } catch (err) { return next(err); }
});

router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parse = itemSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: 'Invalid input', errors: parse.error.issues });

    if (parse.data.sku) {
      const conflict = await prisma.inventoryItem.findFirst({
        where: { sku: parse.data.sku, id: { not: req.params.id } },
      });
      if (conflict) return dupSkuError(res);
    }

    const item = await prisma.inventoryItem.update({ where: { id: req.params.id }, data: parse.data });
    return res.json(item);
  } catch (err) { return next(err); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Deleted' });
  } catch (err) { return next(err); }
});

export default router;
