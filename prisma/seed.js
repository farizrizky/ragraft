const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.chatPreference.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.knowledgeFile.deleteMany();
  await prisma.knowledgeText.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("RagNara2026!", 10);
  const user = await prisma.user.create({
    data: {
      name: "Sovereign",
      email: "superadmin@ragnara.local",
      passwordHash,
    },
    select: { id: true, email: true },
  });

  console.log("Seeded sovereign:", user.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
