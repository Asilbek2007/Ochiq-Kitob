const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

async function initializeDatabase() {
  const prisma = new PrismaClient();
  const rootDir = path.resolve(__dirname, '../../');
  const projectDir = fs.existsSync(path.join(rootDir, 'prisma')) ? rootDir : process.cwd();

  try {
    // 1. Admin va jadvallarni tekshirish
    await prisma.admin.count();
    console.log('✅ Ma\'lumotlar bazasi jadvallari va ulanish tayyor.');
  } catch (err) {
    console.log('⚙️ Jadvallar topilmadi. Prisma db push orqali sinxronizatsiya qilinmoqda...');
    try {
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        stdio: 'inherit',
        cwd: projectDir,
        env: process.env
      });
      console.log('✅ Prisma jadvallari muvaffaqiyatli yaratildi!');
    } catch (pushErr) {
      console.error('⚠️ db push xatoligi:', pushErr.message);
    }
  }

  // 2. Admin borligini tekshirish (yo'q bo'lsa, seed qilib faqat Admin yaratadi)
  try {
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      console.log('👤 Admin akkaunt yaratilmoqda...');
      const seedScriptPath = path.join(projectDir, 'prisma/seed.js');
      if (fs.existsSync(seedScriptPath)) {
        execSync('node prisma/seed.js', {
          stdio: 'inherit',
          cwd: projectDir,
          env: process.env
        });
        console.log('✅ Admin akkaunt tayyorlandi!');
      }
    } else {
      const bookCount = await prisma.book.count();
      console.log(`📚 Bazada hozirda ${bookCount} ta kitob va ${adminCount} ta admin mavjud.`);
    }
  } catch (err) {
    console.error('❌ DB tekshirishda xatolik:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { initializeDatabase };
