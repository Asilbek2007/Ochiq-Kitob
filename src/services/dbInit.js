const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function initializeDatabase() {
  console.log('🔄 Ma\'lumotlar bazasi tekshirilmoqda...');
  try {
    // 1. Prisma jadvallarini avtomatik yaratish (agar yo'q bo'lsa)
    try {
      await prisma.book.count();
      console.log('✅ Ma\'lumotlar bazasi jadvallari mavjud.');
    } catch (tableError) {
      console.log('⚠️ Jadvallar topilmadi. Prisma db push ishga tushirilmoqda...');
      execSync('npx prisma db push --skip-generate', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '../../')
      });
      console.log('✅ Prisma jadvallari muvaffaqiyatli yaratildi!');
    }

    // 2. Kitoblar sonini tekshirish — agar bo'sh bo'lsa, seed ishga tushadi
    const bookCount = await prisma.book.count();
    if (bookCount === 0) {
      console.log('🌱 Baza bo\'sh ekan. Dastlabki 100 ta sara kitob va o\'quvchilar yuklanmoqda (seed)...');
      const seedScriptPath = path.join(__dirname, '../../prisma/seed.js');
      if (fs.existsSync(seedScriptPath)) {
        execSync('node prisma/seed.js', {
          stdio: 'inherit',
          cwd: path.join(__dirname, '../../')
        });
        console.log('✅ Dastlabki ma\'lumotlar (seed) muvaffaqiyatli yuklandi!');
      }
    } else {
      console.log(`📚 Bazada hozirda ${bookCount} ta kitob mavjud.`);
    }
  } catch (err) {
    console.error('❌ Ma\'lumotlar bazasini initsializatsiya qilishda xatolik:', err.message);
  }
}

module.exports = { initializeDatabase };
