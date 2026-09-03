const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Jonli dinamik statistika va hisoblagichlar (Bazadagi haqiqiy ma'lumotlar bo'yicha)
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      actualStudents,
      actualBooks,
      bookCopiesSum,
      totalBorrows,
      activeBorrows,
      overdueBorrows,
      maleStudents,
      femaleStudents,
      monthBorrows,
      weekBorrows,
      last24hBorrows,
      firstBorrowRecord
    ] = await Promise.all([
      prisma.student.count(),
      prisma.book.count(),
      prisma.book.aggregate({ _sum: { totalCopies: true } }),
      prisma.borrow.count(),
      prisma.borrow.count({ where: { status: 'ACTIVE' } }),
      prisma.borrow.count({ where: { status: 'ACTIVE', dueDate: { lt: now } } }),
      prisma.student.count({ where: { gender: 'male' } }),
      prisma.student.count({ where: { gender: 'female' } }),
      prisma.borrow.count({ where: { borrowDate: { gte: last30Days } } }),
      prisma.borrow.count({ where: { borrowDate: { gte: last7Days } } }),
      prisma.borrow.count({ where: { borrowDate: { gte: last24h } } }),
      prisma.borrow.findFirst({ orderBy: { borrowDate: 'asc' } })
    ]);

    // Kunlik o'rtacha ijaralar soni (real dinamik hisob-kitob)
    let dailyAvgBorrows = 0;
    if (totalBorrows > 0) {
      if (firstBorrowRecord) {
        const daysDiff = Math.max(1, Math.ceil((now.getTime() - new Date(firstBorrowRecord.borrowDate).getTime()) / (1000 * 3600 * 24)));
        dailyAvgBorrows = Math.round(totalBorrows / daysDiff);
      } else {
        dailyAvgBorrows = Math.round(monthBorrows / 30);
      }
    }

    const counters = {
      totalBooks: bookCopiesSum._sum.totalCopies || actualBooks,
      totalStudents: actualStudents,
      totalBorrows: totalBorrows,
      activeBorrows: activeBorrows,
      overdueBorrows: overdueBorrows,
      maleStudents: maleStudents,
      femaleStudents: femaleStudents,
      dailyAvgBorrows: dailyAvgBorrows,
      monthBorrows: monthBorrows,
      weekBorrows: weekBorrows,
      last24hBorrows: last24hBorrows
    };

    // Top 5 eng faol o'quvchilar
    const topStudents = await prisma.student.findMany({
      where: { readCount: { gt: 0 } },
      orderBy: { readCount: 'desc' },
      take: 5
    });

    // Eng sara taassurotlar
    const featuredReviews = await prisma.review.findMany({
      where: { isFeatured: true },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        book: true,
        student: true
      }
    });

    // 30 kunlik haqiqiy grafik ma'lumotlari
    const chartData = await generateRealMonthlyChartData();

    res.json({
      success: true,
      data: {
        counters,
        topStudents,
        featuredReviews,
        chartData
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Top 100 Kitoblar (Eng ko'p o'qilganlik bo'yicha)
router.get('/top-books', async (req, res) => {
  try {
    const { search, category } = req.query;
    const where = {};

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { author: { contains: q } }
      ];
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    const books = await prisma.book.findMany({
      where,
      orderBy: { readCount: 'desc' },
      take: 100
    });

    res.json({ success: true, count: books.length, data: books });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Top 30 Kitobxonlar (Eng ko'p kitob o'qiganlik bo'yicha)
router.get('/top-readers', async (req, res) => {
  try {
    const readers = await prisma.student.findMany({
      where: { readCount: { gt: 0 } },
      orderBy: { readCount: 'desc' },
      take: 30
    });

    res.json({ success: true, count: readers.length, data: readers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. O'tgan haftada eng ko'p o'qilgan kitoblar (Top 30)
router.get('/weekly-top', async (req, res) => {
  try {
    const weeklyBooks = await prisma.book.findMany({
      where: { weeklyReadCount: { gt: 0 } },
      orderBy: { weeklyReadCount: 'desc' },
      take: 30
    });

    res.json({ success: true, count: weeklyBooks.length, data: weeklyBooks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: 30 kunlik real ijaralar va qaytarishlar grafigi (1 ta so'rovda tezkor)
async function generateRealMonthlyChartData() {
  const labels = [];
  const borrowedData = [];
  const returnedData = [];

  const now = new Date();
  const day30Ago = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);

  // Oxirgi 30 kunlik barcha ijaralarni 1 marta so'rab olish
  const borrows = await prisma.borrow.findMany({
    where: {
      OR: [
        { borrowDate: { gte: day30Ago } },
        { returnDate: { gte: day30Ago } }
      ]
    },
    select: {
      borrowDate: true,
      returnDate: true,
      status: true
    }
  });

  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);

    const label = `${dayStart.getDate()}.${String(dayStart.getMonth() + 1).padStart(2, '0')}`;
    labels.push(label);

    let bCount = 0;
    let rCount = 0;

    for (const b of borrows) {
      if (b.borrowDate && b.borrowDate >= dayStart && b.borrowDate <= dayEnd) {
        bCount++;
      }
      if (b.status === 'RETURNED' && b.returnDate && b.returnDate >= dayStart && b.returnDate <= dayEnd) {
        rCount++;
      }
    }

    borrowedData.push(bCount);
    returnedData.push(rCount);
  }

  return {
    labels,
    datasets: [
      {
        label: "Olingan kitoblar (Ijara)",
        data: borrowedData,
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.12)',
        fill: true,
        tension: 0.4
      },
      {
        label: "Qaytarilgan kitoblar",
        data: returnedData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.10)',
        fill: true,
        tension: 0.4
      }
    ]
  };
}

module.exports = router;
