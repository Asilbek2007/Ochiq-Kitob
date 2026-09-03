const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Baza tozalanmoqda va noldan (0 stats) ishga tushirilmoqda...');

  // Barcha soxta / namuna ma'lumotlarni o'chirish
  await prisma.review.deleteMany();
  await prisma.borrow.deleteMany();
  await prisma.book.deleteMany();
  await prisma.student.deleteMany();
  await prisma.admin.deleteMany();

  // Admin akkaunt yaratish
  await prisma.admin.create({
    data: {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD || 'Ilmamal03',
      name: 'Kutubxona Mudiri',
      role: 'ADMIN'
    }
  });

  console.log('✅ Baza toza holatga keltirildi:');
  console.log('- Jami kitoblar: 0');
  console.log('- Jami kitobxonlar: 0');
  console.log('- Jami ijaralar: 0');
  console.log('- Admin akkaunt tayyor.');
}

main()
  .catch((e) => {
    console.error('❌ Seed xatosi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
