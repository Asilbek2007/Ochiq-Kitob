const https = require('https');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '@ochiqkitobuz';

let isPollingStarted = false;
let lastUpdateId = 0;

// Telegram API so'rov yuboruvchi yordamchi funksiya
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

// Bot tokenini ishga tushirish va polling boshlash
async function initBot() {
  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.warn('⚠️ Telegram bot tokeni .env faylida yo\'q. Bot ishlamamoqda.');
    return false;
  }
  try {
    const me = await telegramRequest(BOT_TOKEN, 'getMe', {});
    console.log(`✅ Telegram bot ulandi: @${me.username} (${me.first_name}) → ${CHANNEL_ID}`);
    
    // Polling bot buyruqlari va tugmalarni tinglashni boshlash
    if (!isPollingStarted) {
      isPollingStarted = true;
      startBotPolling();
    }
    return true;
  } catch (err) {
    console.error('❌ Telegram bot xatoligi (Token noto\'g\'ri?):', err.message);
    return false;
  }
}

// Interaktiv Bot Polling (Kelgan xabarlar va tugmalar bilan ishlash)
async function startBotPolling() {
  console.log('🤖 Telegram bot menyu va tugmalar faollashtirildi...');

  while (isPollingStarted) {
    try {
      const updates = await telegramRequest(BOT_TOKEN, 'getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 25
      });

      if (Array.isArray(updates)) {
        for (const update of updates) {
          lastUpdateId = update.update_id;
          if (update.message && update.message.text) {
            handleIncomingMessage(update.message).catch(err => console.error('Message handle error:', err.message));
          }
        }
      }
    } catch (err) {
      // Tarmoq xatosi bo'lsa 3 soniya kutib qayta ulanadi
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// Foydalanuvchidan kelgan xabar va tugma bosilishlarini qayta ishlash
async function handleIncomingMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : '';

  const mainKeyboard = {
    keyboard: [
      [{ text: '📊 Kunlik Hisobot' }, { text: '📚 Kitoblar Katalogi' }],
      [{ text: '🏆 Top Kitobxonlar' }, { text: '🕊 Bag\'ishlov & Ma\'lumot' }]
    ],
    resize_keyboard: true
  };

  if (text === '/start' || text === '/help') {
    const welcomeText = `Assalomu alaykum, *${escapeMarkdown(msg.from.first_name || 'Foydalanuvchi')}*\\!\n\n` +
      `📖 *OchiqKitob \\(OpenBook\\)* botiga xush kelibsiz\\!\n\n` +
      `Quyidagi tugmalar orqali kutubxona statistikasi va ma'lumotlarini olishingiz mumkin:`;

    await telegramRequest(BOT_TOKEN, 'sendMessage', {
      chat_id: chatId,
      text: welcomeText,
      parse_mode: 'MarkdownV2',
      reply_markup: mainKeyboard
    });
    return;
  }

  if (text === '📊 Kunlik Hisobot') {
    const reportData = await buildReportMessage();
    await telegramRequest(BOT_TOKEN, 'sendMessage', {
      chat_id: chatId,
      text: reportData.text,
      parse_mode: 'MarkdownV2',
      reply_markup: mainKeyboard
    });
    return;
  }

  if (text === '📚 Kitoblar Katalogi') {
    const totalCount = await prisma.book.count();
    const booksText = `📚 *KUTUBXONA KATALOGI*\n\n` +
      `Hozirda fondimizda *${totalCount} ta* kitob mavjud\\.\n\n` +
      `📖 Barcha kitoblar ro'yxatini ko'rish uchun saytimizga kiring:\n` +
      `🌐 https://ochiqkitob\\.uz/kitoblar\\.html`;

    await telegramRequest(BOT_TOKEN, 'sendMessage', {
      chat_id: chatId,
      text: booksText,
      parse_mode: 'MarkdownV2',
      reply_markup: mainKeyboard
    });
    return;
  }

  if (text === '🏆 Top Kitobxonlar') {
    const topReaders = await prisma.student.findMany({
      where: { readCount: { gt: 0 } },
      orderBy: { readCount: 'desc' },
      take: 5
    });

    let readersText = `🏆 *TOP KITOBXONLAR*\n\n`;
    if (topReaders.length === 0) {
      readersText += `Hozircha kitobxonlar statistikasi 0 ga teng\\. Yangi kitoblar o'qilishi bilan ro'yxat shakllanadi\\!`;
    } else {
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      topReaders.forEach((r, i) => {
        readersText += `${medals[i]} *${escapeMarkdown(r.firstName)} ${escapeMarkdown(r.lastName)}* \\(${escapeMarkdown(r.grade)}\\-sinf\\) — *${r.readCount} ta* kitob\n`;
      });
    }

    await telegramRequest(BOT_TOKEN, 'sendMessage', {
      chat_id: chatId,
      text: readersText,
      parse_mode: 'MarkdownV2',
      reply_markup: mainKeyboard
    });
    return;
  }

  if (text === '🕊 Bag\'ishlov & Ma\'lumot') {
    const infoText = `🕊 *Bag'ishlov:*\n` +
      `_"Ushbu kutubxona marhum Chorshanbiyev Bekmurod xotirasiga bag'ishlab yaratildi. Undan olingan har bir ilm va manfaat u kishining ruhi poklariga sadaqai joriya bo'lsin."_\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📢 Kanalimiz: @ochiqkitobuz\n` +
      `🌐 Veb-saytimiz: https://ochiqkitob\\.uz\n` +
      `_Ilm o'rganishdan hech qachon to'xtamang\\!_ 💡`;

    await telegramRequest(BOT_TOKEN, 'sendMessage', {
      chat_id: chatId,
      text: infoText,
      parse_mode: 'MarkdownV2',
      reply_markup: mainKeyboard
    });
    return;
  }

  // Odatiy xabar
  await telegramRequest(BOT_TOKEN, 'sendMessage', {
    chat_id: chatId,
    text: `Kerakli bo'limni tanlash uchun quyidagi tugmalardan foydalaning:`,
    reply_markup: mainKeyboard
  });
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
        where: { readCount: { gt: 0 } },
        orderBy: { readCount: 'desc' },
        take: 5
      }),
      prisma.book.findMany({
        where: { weeklyReadCount: { gt: 0 } },
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
        msg += `${medals[i]} *${escapeMarkdown(s.firstName)} ${escapeMarkdown(s.lastName)}* \\(${escapeMarkdown(s.grade)}\\-sinf\\) — *${s.readCount} ta* kitob\n`;
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
      msg += `👤 ${escapeMarkdown(borrow.student.firstName)} ${escapeMarkdown(borrow.student.lastName)} \\(${escapeMarkdown(borrow.student.grade)}\\-sinf\\)\n`;
      if (recentReview.comment) {
        msg += `💬 _"${escapeMarkdown(recentReview.comment)}"_\n`;
      }
      msg += `⭐ Baho: ${'⭐️'.repeat(recentReview.rating)}\n`;
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📢 Kanalimiz: @ochiqkitobuz\n`;
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
    let result;
    try {
      result = await telegramRequest(BOT_TOKEN, 'sendMessage', {
        chat_id: CHANNEL_ID,
        text: reportData.text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true
      });
    } catch (markdownErr) {
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
