import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  // const employeePassword = await bcrypt.hash("employee123", 10);

  await prisma.user.upsert({
    where: { email: "admin@optivision.com" },
    update: {
      passwordHash: adminPassword,
    },
    create: {
      name: "Admin User",
      email: "admin@optivision.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  // await prisma.user.upsert({
  //   where: { email: "staff@optivision.com" },
  //   update: {
  //     passwordHash: employeePassword,
  //   },
  //   create: {
  //     name: "Staff Member",
  //     email: "staff@optivision.com",
  //     passwordHash: employeePassword,
  //     role: "EMPLOYEE",
  //   },
  // });

  console.log("Seed complete.");
  console.log("Admin:    admin@optivision.com  / admin123");
  // console.log("Employee: staff@optivision.com  / employee123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
