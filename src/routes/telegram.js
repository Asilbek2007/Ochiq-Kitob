const express = require('express');
const router = express.Router();
const telegramService = require('../services/telegramService');

// Hisobotni ko'rish yoki darhol yuborish
router.post('/test-report', async (req, res) => {
  try {
    const { sendNow = false } = req.body;

    if (sendNow) {
      const result = await telegramService.sendReportToChannel();
      return res.json({
        success: result.success,
        message: result.message || 'Hisobot yuborildi',
        error: result.error,
        data: result.data
      });
    }

    // Faqat ko'rish uchun — yubormasdan
    const report = await telegramService.buildReportMessage();
    res.json({
      success: report.success,
      data: report
    });
  } catch (error) {
    console.error('Telegram hisobot xatoligi:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
