import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { SAMPLE_PROPERTIES } from "../src/lib/sampleProperties";

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.upsert({
    where: { firebaseUid: "demo-landlord-seed" },
    update: {},
    create: {
      firebaseUid: "demo-landlord-seed",
      email: "demo@rentwise.app",
      name: "RentWise Demo",
      role: "LANDLORD",
    },
  });

  for (const sample of SAMPLE_PROPERTIES) {
    const exists = await prisma.property.findFirst({
      where: { landlordId: demo.id, title: sample.title },
    });
    if (!exists) {
      await prisma.property.create({ data: { ...sample, landlordId: demo.id } });
    }
  }

  const count = await prisma.property.count({ where: { landlordId: demo.id } });
  console.log(`Seed done. Demo landlord owns ${count} sample properties.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
