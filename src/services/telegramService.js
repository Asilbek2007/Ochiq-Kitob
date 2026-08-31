const https = require('https');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '@ochiqkitobuz';

// Telegram API so'rov yuboruvchi yordamchi funksiya (tashqi kutubxona kerak emas)
function telegramRequest(token, method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params);
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: '/bot' + token + '/' + method,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body, 'utf8')
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) resolve(parsed.result);
          else reject(new Error(parsed.description || 'Telegram API xatosi: ' + data));
        } catch (e) {
          reject(new Error('JSON parse xatosi'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Bot tokenini ishga tushirish va tekshirish
async function initBot() {
  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.warn('⚠️  Telegram bot tokeni .env faylida yo\'q. Bot ishlamamoqda.');
    return false;
  }
  try {
    const me = await telegramRequest(BOT_TOKEN, 'getMe', {});
    console.log(`✅  Telegram bot ulandi: @${me.username} (${me.first_name}) → ${CHANNEL_ID}`);
    return true;
  } catch (err) {
    console.error('❌ Telegram bot xatoligi (Token noto\'g\'ri?):', err.message);
    return false;
  }
}

// Kunlik hisobot matni tuzish
async function buildReportMessage() {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalBooks,
      totalStudents,
      totalBorrows,
      activeBorrows,
      weeklyFinished,
      topStudents,
      topBooks,
      recentReview,
      overdueBorrows
    ] = await Promise.all([
      prisma.book.count(),
      prisma.student.count(),
      prisma.borrow.count(),
      prisma.borrow.count({ where: { status: 'ACTIVE' } }),
      prisma.borrow.count({
        where: { status: 'RETURNED', returnDate: { gte: weekAgo } }
      }),
      prisma.student.findMany({
        orderBy: { readCount: 'desc' },
        take: 5
      }),
      prisma.book.findMany({
        orderBy: { weeklyReadCount: 'desc' },
        take: 5
      }),
      prisma.review.findFirst({
        where: { rating: 5 },
        orderBy: { createdAt: 'desc' },
        include: {
          borrow: {
            include: { book: true, student: true }
          }
        }
      }),
      prisma.borrow.count({
        where: { status: 'ACTIVE', dueDate: { lt: now } }
      })
    ]);

    const dateStr = now.toLocaleDateString('uz-UZ', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('uz-UZ', {
      hour: '2-digit', minute: '2-digit'
    });

    let msg = '';
    msg += `📖 *OCHIQ KITOB — KUNLIK HISOBOT*\n`;
    msg += `_Barchaga ochiq va bepul ilm manbai_\n\n`;
    msg += `🕊 *Bag'ishlov:*\n`;
    msg += `_"Ushbu kutubxona marhum Chorshanbiyev Bekmurod xotirasiga bag'ishlab yaratildi. Undan olingan har bir ilm va manfaat u kishining ruhi poklariga sadaqai joriya bo'lsin."_\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📅 *Sana:* ${dateStr}, soat ${timeStr}\n\n`;
    msg += `📊 *Bugungi holat:*\n`;
    msg += `📚 Jami kitoblar: *${totalBooks.toLocaleString()} ta*\n`;
    msg += `🧑‍🎓 Jami kitobxonlar: *${totalStudents.toLocaleString()} nafar*\n`;
    msg += `📖 Barcha vaqt ijaralari: *${totalBorrows.toLocaleString()} ta*\n`;
    msg += `📗 Hozirda o'qilmoqda: *${activeBorrows} ta*\n`;

    if (overdueBorrows > 0) {
      msg += `⚠️ Muddati o'tgan: *${overdueBorrows} ta*\n`;
    }

    msg += `\n📈 *Oxirgi 7 kun:*\n`;
    msg += `✅ O'qib tugatildi: *${weeklyFinished} ta kitob*\n`;

    if (topStudents.length > 0) {
      msg += `\n🏆 *Top kitobxonlar:*\n`;
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      topStudents.forEach((s, i) => {
        msg += `${medals[i]} *${s.firstName} ${s.lastName}* \\(${s.grade}\\-sinf\\) — *${s.readCount} ta* kitob\n`;
      });
    }

    if (topBooks.length > 0) {
      msg += `\n📚 *Eng ko'p o'qilgan kitoblar:*\n`;
      topBooks.forEach((b, i) => {
        const count = b.weeklyReadCount || b.readCount || 0;
        msg += `${i + 1}\\. _«${escapeMarkdown(b.title)}»_ — ${count} marta\n`;
      });
    }

    if (recentReview && recentReview.borrow) {
      const { borrow } = recentReview;
      msg += `\n🌟 *Sara o'quvchi xulosasi:*\n`;
      msg += `📚 _«${escapeMarkdown(borrow.book.title)}»_\n`;
      msg += `👤 ${borrow.student.firstName} ${borrow.student.lastName} \\(${borrow.student.grade}\\-sinf\\)\n`;
      if (recentReview.comment) {
        msg += `💬 _"${escapeMarkdown(recentReview.comment)}"_\n`;
      }
      msg += `⭐ Baho: ${'⭐️'.repeat(recentReview.rating)}\n`;
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📢 Kanalimiz: https://t.me/ochiqkitobuz\n`;
    msg += `_Ilm o'rganishdan hech qachon to'xtamang\\!_ 💡`;

    return { text: msg, success: true };
  } catch (err) {
    console.error('❌ Hisobot tuzishda xatolik:', err);
    return { text: '', success: false, error: err.message };
  }
}

// Markdown V2 uchun maxsus belgilarni escape qilish
function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

// Kanalga hisobot yuborish
async function sendReportToChannel() {
  const reportData = await buildReportMessage();

  if (!reportData.success) {
    return { success: false, error: reportData.error };
  }

  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log('\n📋 [BOT TOKEN YO\'Q] Hisobot konsolga chiqarildi:\n');
    console.log(reportData.text);
    return {
      success: true,
      message: 'Bot token sozlanmagan, hisobot konsolga chiqarildi',
      data: { text: reportData.text }
    };
  }

  try {
    // Birinchi MarkdownV2 bilan sinab ko'ramiz
    let result;
    try {
      result = await telegramRequest(BOT_TOKEN, 'sendMessage', {
        chat_id: CHANNEL_ID,
        text: reportData.text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true
      });
    } catch (markdownErr) {
      // Markdown muvaffaqiyatsiz bo'lsa — oddiy matn sifatida
      console.warn('⚠️ Markdown xatosi, oddiy matn sifatida yuborilmoqda...');
      const plainText = reportData.text.replace(/[*_`[\]()~>#+\-=|{}.!\\]/g, '');
      result = await telegramRequest(BOT_TOKEN, 'sendMessage', {
        chat_id: CHANNEL_ID,
        text: plainText,
        disable_web_page_preview: true
      });
    }

    console.log(`✅ Telegram hisoboti ${CHANNEL_ID} kanaliga yuborildi! Message ID: ${result.message_id}`);
    return {
      success: true,
      message: `Hisobot ${CHANNEL_ID} kanaliga muvaffaqiyatli yuborildi! 🎉 (ID: ${result.message_id})`
    };
  } catch (err) {
    console.error('❌ Telegram yuborishda xatolik:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  initBot,
  sendReportToChannel,
  buildReportMessage,
  telegramRequest
};
