const cron = require('node-cron');
const telegramService = require('./telegramService');

async function initCronJobs() {
  // Bot tokenini tekshirish va bot pollingni ishga tushirish
  await telegramService.initBot();

  // Har kuni Toshkent vaqti bilan kechki soat 23:00 da (11:00 PM)
  cron.schedule('0 23 * * *', async () => {
    console.log('⏰ [CRON 23:00] Kunlik Telegram hisobotini yuborish...');
    try {
      const result = await telegramService.sendReportToChannel();
      if (result.success) {
        console.log('✅ [CRON] ' + result.message);
      } else {
        console.error('❌ [CRON] Xatolik:', result.error);
      }
    } catch (err) {
      console.error('❌ [CRON] Kutilmagan xatolik:', err.message);
    }
  }, {
    timezone: 'Asia/Tashkent'
  });

  console.log('⏳ Kunlik hisobot Cron faollashtirildi (Har kuni 23:00 — Toshkent vaqti).');
}

module.exports = { initCronJobs };
