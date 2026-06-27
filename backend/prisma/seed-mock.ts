import "dotenv/config";
import { PrismaClient, Customer, Examination, InventoryItem } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── helpers ────────────────────────────────────────────────────────────────
function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱  Seeding mock data …");

  // ── 1. Users ──────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 10);
  const empHash   = await bcrypt.hash("employee123", 10);

  const admin = await prisma.user.upsert({
    where:  { email: "admin@optivision.com" },
    update: { passwordHash: adminHash },
    create: { name: "Ahmed Al-Rashidi", email: "admin@optivision.com", passwordHash: adminHash, role: "ADMIN" },
  });

  const emp = await prisma.user.upsert({
    where:  { email: "staff@optivision.com" },
    update: { passwordHash: empHash },
    create: { name: "Sara Al-Mansouri", email: "staff@optivision.com", passwordHash: empHash, role: "EMPLOYEE" },
  });

  console.log("  ✅ Users");

  // ── 2. Customers ──────────────────────────────────────────────────────────
  const customerData = [
    { name: "محمد علي",        phone: "0501234567", email: "mohammed@example.com",  dateOfBirth: new Date("1985-03-15"), address: "شارع الملك فهد، الرياض" },
    { name: "فاطمة الزهراني",  phone: "0512345678", email: "fatima@example.com",    dateOfBirth: new Date("1990-07-22"), address: "حي النزهة، جدة" },
    { name: "خالد الشمري",     phone: "0523456789", email: "khalid@example.com",    dateOfBirth: new Date("1978-11-08"), address: "شارع التحلية، الدمام" },
    { name: "نورة القحطاني",   phone: "0534567890", email: "noura@example.com",     dateOfBirth: new Date("1995-01-30"), address: "حي السليمانية، الرياض" },
    { name: "عبدالله المطيري", phone: "0545678901", email: "abdulla@example.com",   dateOfBirth: new Date("1982-06-14"), address: "حي الروضة، الرياض" },
    { name: "ريم الحربي",      phone: "0556789012", email: "reem@example.com",      dateOfBirth: new Date("1998-09-03"), address: "شارع الأمير سلطان، جدة" },
    { name: "سعد العتيبي",     phone: "0567890123", email: "saad@example.com",      dateOfBirth: new Date("1975-04-19"), address: "حي الفيصلية، مكة" },
    { name: "منى الدوسري",     phone: "0578901234", email: "mona@example.com",      dateOfBirth: new Date("1993-12-25"), address: "حي الخبر الشمالية، الخبر" },
    { name: "تركي الغامدي",    phone: "0589012345", email: "turki@example.com",     dateOfBirth: new Date("1988-02-11"), address: "حي المروج، الرياض" },
    { name: "هند السبيعي",     phone: "0590123456", email: "hind@example.com",      dateOfBirth: new Date("2000-05-07"), address: "حي الشفا، الرياض" },
    { name: "يوسف المالكي",    phone: "0501357924", email: "yousef@example.com",    dateOfBirth: new Date("1970-08-21"), address: "حي العزيزية، مكة" },
    { name: "لمياء الجهني",    phone: "0512468035", email: "lamia@example.com",     dateOfBirth: new Date("1996-10-16"), address: "حي الصفاء، جدة" },
  ];

  const customers: Customer[] = [];
  for (const c of customerData) {
    const cust = await prisma.customer.create({ data: c });
    customers.push(cust);
  }

  // Link two pairs as family (parent-child)
  await prisma.customer.update({ where: { id: customers[2].id }, data: { parentId: customers[0].id } });
  await prisma.customer.update({ where: { id: customers[3].id }, data: { parentId: customers[1].id } });

  console.log("  ✅ Customers");

  // ── 3. Examinations ───────────────────────────────────────────────────────
  const examDataSets = [
    { rightSph: -1.50, rightCyl: -0.75, rightAxis: 180, leftSph: -2.00, leftCyl: -0.50, leftAxis: 175, ipd: 63.0, add: null,  height: 18.0, doctor: "د. عمر الجبر" },
    { rightSph: -3.25, rightCyl: -1.25, rightAxis: 90,  leftSph: -3.00, leftCyl: -1.00, leftAxis:  85, ipd: 61.5, add: null,  height: null,  doctor: "د. سهيلة العمر" },
    { rightSph:  0.50, rightCyl: -0.25, rightAxis: 10,  leftSph:  0.75, leftCyl: -0.25, leftAxis:  15, ipd: 65.0, add: 2.00, height: 20.0, doctor: "د. عمر الجبر" },
    { rightSph: -0.75, rightCyl:  0.00, rightAxis: null, leftSph: -1.00, leftCyl:  0.00, leftAxis: null, ipd: 62.0, add: null,  height: null,  doctor: null },
    { rightSph: -4.00, rightCyl: -1.50, rightAxis: 175, leftSph: -4.25, leftCyl: -1.75, leftAxis: 170, ipd: 60.0, add: null,  height: 17.5, doctor: "د. سهيلة العمر" },
    { rightSph:  1.00, rightCyl: -0.50, rightAxis: 20,  leftSph:  1.25, leftCyl: -0.75, leftAxis:  25, ipd: 64.0, add: 1.50, height: 19.0, doctor: "د. عمر الجبر" },
    { rightSph: -2.00, rightCyl: -0.75, rightAxis: 90,  leftSph: -1.75, leftCyl: -0.50, leftAxis:  85, ipd: 63.5, add: null,  height: null,  doctor: null },
    { rightSph: -0.50, rightCyl: -0.25, rightAxis: 5,   leftSph:  0.00, leftCyl:  0.00, leftAxis: null, ipd: 61.0, add: null,  height: null,  doctor: "د. سهيلة العمر" },
  ];

  const examinations: Examination[] = [];
  for (let i = 0; i < examDataSets.length; i++) {
    const e = examDataSets[i];
    const cust = customers[i % customers.length];
    const exam = await prisma.examination.create({
      data: {
        customerId: cust.id,
        doctor:     e.doctor ?? undefined,
        date:       daysAgo(i * 12),
        rightSph:   e.rightSph   ?? undefined,
        rightCyl:   e.rightCyl   ?? undefined,
        rightAxis:  e.rightAxis  ?? undefined,
        leftSph:    e.leftSph    ?? undefined,
        leftCyl:    e.leftCyl    ?? undefined,
        leftAxis:   e.leftAxis   ?? undefined,
        add:        e.add        ?? undefined,
        ipd:        e.ipd        ?? undefined,
        height:     e.height     ?? undefined,
        notes: i === 2 ? "مريض يحتاج عدسات تقدمية" : undefined,
      },
    });
    examinations.push(exam);
  }

  console.log("  ✅ Examinations");

  // ── 4. Inventory Items ────────────────────────────────────────────────────
  const frames = [
    { brand: "Ray-Ban",   model: "RB5154 Clubmaster",  color: "أسود / ذهبي",  material: "إطار معدن", price: 450, quantity: 8,  sku: "RB-5154-BG" },
    { brand: "Oakley",    model: "OX8046 Crosslink",   color: "رمادي",        material: "بلاستيك",   price: 380, quantity: 5,  sku: "OK-8046-GR" },
    { brand: "Gucci",     model: "GG0061O",            color: "هافانا",       material: "أسيتات",    price: 890, quantity: 3,  sku: "GC-0061-HV" },
    { brand: "Tom Ford",  model: "TF5634-B",           color: "أزرق / ذهبي", material: "معدن",      price: 750, quantity: 4,  sku: "TF-5634-BG" },
    { brand: "Silhouette",model: "Momentum",           color: "فضي",         material: "تيتانيوم",  price: 620, quantity: 6,  sku: "SL-MOM-SL" },
    { brand: "Generic",   model: "Kids Round",         color: "أحمر",        material: "مرن",       price: 180, quantity: 12, sku: "GN-KID-RD" },
  ];

  const lenses = [
    { brand: "Essilor",  model: "Varilux Comfort 3F",   lensType: "Progressive", coating: "Crizal Forte UV", lensIndex: 1.67, price: 650, quantity: 20, sku: "ES-VAR3F-167" },
    { brand: "Zeiss",    model: "Individual 2",          lensType: "Progressive", coating: "DuraVision Platinum", lensIndex: 1.74, price: 950, quantity: 15, sku: "ZS-IND2-174" },
    { brand: "Hoya",     model: "iD MySelf",             lensType: "Progressive", coating: "Hi-Vision LongLife", lensIndex: 1.60, price: 480, quantity: 18, sku: "HY-IDMS-160" },
    { brand: "Essilor",  model: "Single Vision FE",      lensType: "Single",      coating: "Crizal Easy",      lensIndex: 1.50, price: 220, quantity: 30, sku: "ES-SVFE-150" },
    { brand: "Generic",  model: "Photochromic",          lensType: "Single",      coating: "AR + UV",          lensIndex: 1.56, price: 300, quantity: 25, sku: "GN-PHO-156" },
  ];

  const accessories = [
    { brand: "Generic", model: "حافظة جلد فاخرة",       category: "حافظة",     price: 45,  quantity: 50, sku: "ACC-CASE-LTH" },
    { brand: "Generic", model: "قماش تنظيف مايكروفايبر", category: "تنظيف",    price: 10,  quantity: 100, sku: "ACC-CLTH-MF" },
    { brand: "Oakley",  model: "سلسلة نظارة جلدية",     category: "إكسسوار",  price: 35,  quantity: 20, sku: "ACC-CHNL-OK" },
    { brand: "Generic", model: "مسامير إطار احتياطي",   category: "قطع غيار", price: 15,  quantity: 40, sku: "ACC-SCR-KIT" },
  ];

  const invItems: InventoryItem[] = [];

  for (const f of frames) {
    const item = await prisma.inventoryItem.create({ data: { type: "FRAME", ...f } });
    invItems.push(item);
  }
  for (const l of lenses) {
    const item = await prisma.inventoryItem.create({ data: { type: "LENS", ...l } });
    invItems.push(item);
  }
  for (const a of accessories) {
    const item = await prisma.inventoryItem.create({ data: { type: "ACCESSORY", ...a } });
    invItems.push(item);
  }

  console.log("  ✅ Inventory");

  // ── 5. Orders + Invoices + Payments ──────────────────────────────────────
  const statuses: ("NEW" | "IN_PROGRESS" | "READY" | "DELIVERED")[] = ["NEW", "IN_PROGRESS", "READY", "DELIVERED"];

  // Helper: create one full order→invoice→payment cycle
  async function createOrderWithInvoice(
    custIdx: number,
    examIdx: number | null,
    frameIdx: number,
    lensIdx: number,
    orderStatus: "NEW" | "IN_PROGRESS" | "READY" | "DELIVERED",
    invoiceStatus: "UNPAID" | "PARTIAL" | "PAID",
    daysBack: number,
  ) {
    const cust     = customers[custIdx];
    const frame    = invItems[frameIdx];
    const lens     = invItems[lensIdx];
    const accItem  = invItems[invItems.length - 2]; // cleaning cloth
    const total    = frame.price + lens.price * 2 + accItem.price;
    const paid     = invoiceStatus === "PAID"    ? total
                   : invoiceStatus === "PARTIAL" ? Math.round(total * 0.5)
                   : 0;

    const invoice = await prisma.invoice.create({
      data: {
        customerId:    cust.id,
        totalAmount:   total,
        paidAmount:    paid,
        paymentMethod: rnd(["cash", "card", "transfer"]),
        status:        invoiceStatus,
        createdById:   rnd([admin.id, emp.id]),
        createdAt:     daysAgo(daysBack),
        updatedAt:     daysAgo(daysBack),
        notes:         invoiceStatus === "PARTIAL" ? "دفعة جزئية، الباقي عند الاستلام" : undefined,
        payments: paid > 0 ? {
          create: [{
            amount: paid,
            method: rnd(["cash", "card"]),
            date:   daysAgo(daysBack),
          }],
        } : undefined,
      },
    });

    const order = await prisma.order.create({
      data: {
        customerId:    cust.id,
        examinationId: examIdx !== null ? examinations[examIdx].id : undefined,
        invoiceId:     invoice.id,
        status:        orderStatus,
        createdById:   rnd([admin.id, emp.id]),
        createdAt:     daysAgo(daysBack),
        updatedAt:     daysAgo(daysBack),
        items: {
          create: [
            { inventoryItemId: frame.id, quantity: 1, price: frame.price },
            { inventoryItemId: lens.id,  quantity: 2, price: lens.price  },
            { inventoryItemId: accItem.id, quantity: 1, price: accItem.price },
          ],
        },
      },
    });

    return { invoice, order };
  }

  await createOrderWithInvoice(0,  0, 0, 6,  "DELIVERED", "PAID",    45);
  await createOrderWithInvoice(1,  1, 2, 7,  "DELIVERED", "PAID",    38);
  await createOrderWithInvoice(2,  2, 3, 8,  "READY",     "PARTIAL", 21);
  await createOrderWithInvoice(3,  3, 1, 6,  "IN_PROGRESS","PARTIAL",14);
  await createOrderWithInvoice(4,  4, 4, 7,  "IN_PROGRESS","UNPAID",  9);
  await createOrderWithInvoice(5,  5, 0, 9,  "NEW",       "UNPAID",   5);
  await createOrderWithInvoice(6,  6, 5, 6,  "DELIVERED", "PAID",    60);
  await createOrderWithInvoice(7,  7, 2, 8,  "DELIVERED", "PAID",    75);
  await createOrderWithInvoice(8,  null, 1, 7, "NEW",     "UNPAID",   2);
  await createOrderWithInvoice(9,  null, 3, 9, "IN_PROGRESS","PARTIAL",7);
  await createOrderWithInvoice(10, null, 4, 6, "DELIVERED", "PAID",   90);
  await createOrderWithInvoice(11, null, 0, 8, "READY",   "PARTIAL",  3);

  console.log("  ✅ Orders, Invoices & Payments");
  console.log("");
  console.log("─────────────────────────────────────────");
  console.log("🎉  Mock seed complete!");
  console.log("  Admin login:    admin@optivision.com  / admin123");
  console.log("  Employee login: staff@optivision.com  / employee123");
  console.log(`  Customers:   ${customers.length}`);
  console.log(`  Examinations: ${examinations.length}`);
  console.log(`  Inventory:   ${invItems.length} items`);
  console.log("  Orders:       12");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
