const cron = require('node-cron');
const telegramService = require('./telegramService');

async function initCronJobs() {
  // Bot tokenini tekshirish
  await telegramService.initBot();

  // Har kuni Toshkent vaqti bilan ertalab soat 08:00 da
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ [CRON 08:00] Kunlik Telegram hisobotini yuborish...');
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

  console.log('⏳ Kunlik hisobot Cron faollashtirildi (Har kuni 08:00 — Toshkent vaqti).');
}

module.exports = { initCronJobs };
