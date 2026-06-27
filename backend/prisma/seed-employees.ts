import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("👤  Adding 3 employees …");

  const employees = [
    {
      name: "سارة المنصوري",
      email: "sara.mansouri@optivision.com",
      password: "sara@2024",
    },
    {
      name: "عمر الحربي",
      email: "omar.harbi@optivision.com",
      password: "omar@2024",
    },
    {
      name: "لينا الشهري",
      email: "lina.shahri@optivision.com",
      password: "lina@2024",
    },
  ];

  for (const emp of employees) {
    const hash = await bcrypt.hash(emp.password, 10);
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: { passwordHash: hash, name: emp.name },
      create: {
        name: emp.name,
        email: emp.email,
        passwordHash: hash,
        role: "EMPLOYEE",
        isActive: true,
      },
    });
    console.log(`  ✅ ${user.name}  (${user.email})  pw: ${emp.password}`);
  }

  console.log("");
  console.log("─────────────────────────────────────────────────────");
  console.log("🎉  Done! Employees summary:");
  console.log("  sara.mansouri@optivision.com  / sara@2024");
  console.log("  omar.harbi@optivision.com     / omar@2024");
  console.log("  lina.shahri@optivision.com    / lina@2024");
  console.log("─────────────────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
