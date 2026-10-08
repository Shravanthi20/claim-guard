import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const user = await prisma.user.upsert({
    where: {
      email: "customer@claimguard.com",
    },
    update: {},
    create: {
      name: "Demo Customer",
      email: "customer@claimguard.com",
      role: "CUSTOMER",
    },
  });

  console.log("Development user created:");
  console.log(user);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });