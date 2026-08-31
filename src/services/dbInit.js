const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function initializeDatabase() {
  console.log('🔄 Ma\'lumotlar bazasi tekshirilmoqda...');

  const rootDir = path.resolve(__dirname, '../../');
  const projectDir = fs.existsSync(path.join(rootDir, 'prisma')) ? rootDir : process.cwd();

  // 1. Prisma jadvallarini avtomatik yaratish/yangilash
  try {
    console.log('⚙️ Prisma db push orqali jadvallarni sinxronizatsiya qilish...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'inherit',
      cwd: projectDir,
      env: process.env
    });
    console.log('✅ Prisma jadvallari muvaffaqiyatli tayyorlandi!');
  } catch (err) {
    console.error('⚠️ db push xatosi (davom etilmoqda):', err.message);
  }

  // 2. PrismaClient bilan tekshirish va seed qilish
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const bookCount = await prisma.book.count();
    if (bookCount === 0) {
      console.log('🌱 Baza bo\'sh ekan. Dastlabki 100 ta sara kitob va o\'quvchilar yuklanmoqda (seed)...');
      const seedScriptPath = path.join(projectDir, 'prisma/seed.js');
      if (fs.existsSync(seedScriptPath)) {
        execSync('node prisma/seed.js', {
          stdio: 'inherit',
          cwd: projectDir,
          env: process.env
        });
        console.log('✅ Dastlabki ma\'lumotlar (seed) muvaffaqiyatli yuklandi!');
      }
    } else {
      console.log(`📚 Bazada hozirda ${bookCount} ta kitob mavjud.`);
    }
  } catch (err) {
    console.error('❌ Ma\'lumotlar bazasi tekshiruvida xatolik:', err.message);
  }
}

module.exports = { initializeDatabase };
