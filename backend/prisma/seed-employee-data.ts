import "dotenv/config";
import { PrismaClient, Customer, InventoryItem } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🌱  Seeding employee-linked data …");

  // ── Fetch existing employees ──────────────────────────────────────────────
  const sara  = await prisma.user.findUniqueOrThrow({ where: { email: "sara.mansouri@optivision.com" } });
  const omar  = await prisma.user.findUniqueOrThrow({ where: { email: "omar.harbi@optivision.com" } });
  const lina  = await prisma.user.findUniqueOrThrow({ where: { email: "lina.shahri@optivision.com" } });

  // ── Fetch inventory to attach to orders ──────────────────────────────────
  const frames      = await prisma.inventoryItem.findMany({ where: { type: "FRAME" },     take: 4 });
  const lenses      = await prisma.inventoryItem.findMany({ where: { type: "LENS" },      take: 4 });
  const accessories = await prisma.inventoryItem.findMany({ where: { type: "ACCESSORY" }, take: 2 });

  // ── Customer data per employee ────────────────────────────────────────────
  const employeeCustomers: { userId: string; name: string; customers: any[] }[] = [
    {
      userId: sara.id,
      name: sara.name,
      customers: [
        { name: "وليد الرشيدي",   phone: "0551122334", email: "waleed@test.com",  dateOfBirth: new Date("1987-04-10"), address: "حي الياسمين، الرياض" },
        { name: "أسماء الفيفي",   phone: "0562233445", email: "asma@test.com",    dateOfBirth: new Date("1993-08-21"), address: "حي الصواري، جدة" },
        { name: "بدر العنزي",     phone: "0573344556", email: "badr@test.com",    dateOfBirth: new Date("1980-02-14"), address: "حي الريان، الرياض" },
      ],
    },
    {
      userId: omar.id,
      name: omar.name,
      customers: [
        { name: "حمد الخالدي",    phone: "0584455667", email: "hamad@test.com",   dateOfBirth: new Date("1975-06-05"), address: "حي الملز، الرياض" },
        { name: "دانة السلمي",    phone: "0595566778", email: "dana@test.com",    dateOfBirth: new Date("2001-11-30"), address: "حي الحمراء، جدة" },
        { name: "فيصل الدوسري",   phone: "0506677889", email: "faisal@test.com",  dateOfBirth: new Date("1983-09-17"), address: "حي العروبة، الدمام" },
      ],
    },
    {
      userId: lina.id,
      name: lina.name,
      customers: [
        { name: "مريم الشمري",    phone: "0517788990", email: "maryam@test.com",  dateOfBirth: new Date("1997-03-28"), address: "حي الوادي، الرياض" },
        { name: "سلطان الغامدي",  phone: "0528899001", email: "sultan@test.com",  dateOfBirth: new Date("1969-12-01"), address: "حي الأمواج، جدة" },
      ],
    },
  ];

  // ── Order configs: (status, invoiceStatus, daysBack) ────────────────────
  const orderConfigs: Array<{
    status: "NEW" | "IN_PROGRESS" | "READY" | "DELIVERED";
    invoiceStatus: "UNPAID" | "PARTIAL" | "PAID";
    daysBack: number;
  }> = [
    { status: "DELIVERED",   invoiceStatus: "PAID",    daysBack: 30 },
    { status: "READY",       invoiceStatus: "PARTIAL", daysBack: 10 },
    { status: "IN_PROGRESS", invoiceStatus: "UNPAID",  daysBack: 4  },
  ];

  for (const { userId, name, customers: custList } of employeeCustomers) {
    console.log(`\n  👤 ${name}`);

    const createdCustomers: Customer[] = [];
    for (const cData of custList) {
      const c = await prisma.customer.create({ data: cData });
      createdCustomers.push(c);
      console.log(`     + Customer: ${c.name}`);
    }

    // Each customer gets one order+invoice
    for (let i = 0; i < createdCustomers.length; i++) {
      const cust   = createdCustomers[i];
      const cfg    = orderConfigs[i % orderConfigs.length];
      const frame  = frames[i % frames.length];
      const lens   = lenses[i % lenses.length];
      const acc    = accessories[0];

      const total  = frame.price + lens.price * 2 + acc.price;
      const paid   = cfg.invoiceStatus === "PAID"    ? total
                   : cfg.invoiceStatus === "PARTIAL" ? Math.round(total * 0.4)
                   : 0;

      const createdAt = daysAgo(cfg.daysBack);

      const invoice = await prisma.invoice.create({
        data: {
          customerId:    cust.id,
          totalAmount:   total,
          paidAmount:    paid,
          paymentMethod: rnd(["cash", "card", "transfer"]),
          status:        cfg.invoiceStatus,
          createdById:   userId,
          createdAt,
          updatedAt: createdAt,
          notes: cfg.invoiceStatus === "PARTIAL" ? "دفعة أولى، الباقي عند الاستلام" : undefined,
          payments: paid > 0 ? {
            create: [{ amount: paid, method: rnd(["cash", "card"]), date: createdAt }],
          } : undefined,
        },
      });

      await prisma.order.create({
        data: {
          customerId:  cust.id,
          invoiceId:   invoice.id,
          status:      cfg.status,
          createdById: userId,
          createdAt,
          updatedAt: createdAt,
          items: {
            create: [
              { inventoryItemId: frame.id, quantity: 1, price: frame.price },
              { inventoryItemId: lens.id,  quantity: 2, price: lens.price  },
              { inventoryItemId: acc.id,   quantity: 1, price: acc.price   },
            ],
          },
        },
      });

      console.log(`     + Order (${cfg.status}) + Invoice (${cfg.invoiceStatus}) → ${cust.name}`);
    }
  }

  // ── Lina gets no sales (zero orders) – she'll still show via backend fix ─
  console.log(`\n  ℹ️  لينا الشهري has 2 customers but her 3rd slot intentionally left as NEW/UNPAID`);

  console.log("\n─────────────────────────────────────────");
  console.log("🎉  Employee data seed complete!");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
