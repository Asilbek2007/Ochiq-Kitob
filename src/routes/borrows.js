const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Barcha ijaralarni olish (Status filtrlash bilan)
router.get('/', async (req, res) => {
  try {
    const { status, limit } = req.query;
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status; // 'ACTIVE' or 'RETURNED'
    }

    const borrows = await prisma.borrow.findMany({
      where,
      orderBy: { borrowDate: 'desc' },
      take: limit ? parseInt(limit) : undefined,
      include: {
        book: true,
        student: true,
        review: true
      }
    });

    res.json({ success: true, count: borrows.length, data: borrows });
  } catch (error) {
    console.error('Error fetching borrows:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Kitob berish (Checkout / Borrow)
router.post('/checkout', async (req, res) => {
  try {
    const { bookId, studentId, durationDays = 7, notes } = req.body;

    if (!bookId || !studentId) {
      return res.status(400).json({
        success: false,
        error: 'Kitob va O\'quvchi tanlanishi shart'
      });
    }

    const bId = parseInt(bookId);
    const sId = parseInt(studentId);
    const days = parseInt(durationDays) || 7;

    // Kitob holatini tekshirish
    const book = await prisma.book.findUnique({ where: { id: bId } });
    if (!book) {
      return res.status(404).json({ success: false, error: 'Kitob topilmadi' });
    }

    if (book.status === 'BORROWED') {
      return res.status(400).json({
        success: false,
        error: 'Bu kitob ayni paytda BAND (boshqa o\'quvchida).'
      });
    }

    // O'quvchini tekshirish
    const student = await prisma.student.findUnique({ where: { id: sId } });
    if (!student) {
      return res.status(404).json({ success: false, error: 'O\'quvchi topilmadi' });
    }

    const borrowDate = new Date();
    const dueDate = new Date(borrowDate.getTime() + days * 24 * 60 * 60 * 1000);

    // Tranzaksiya: Borrow yaratish va Kitob holatini BORROWED qilish
    const [newBorrow, updatedBook] = await prisma.$transaction([
      prisma.borrow.create({
        data: {
          bookId: bId,
          studentId: sId,
          borrowDate,
          dueDate,
          status: 'ACTIVE',
          isFinished: false,
          notes: notes ? notes.trim() : null
        },
        include: {
          book: true,
          student: true
        }
      }),
      prisma.book.update({
        where: { id: bId },
        data: { status: 'BORROWED' }
      })
    ]);

    res.status(201).json({
      success: true,
      message: `«${book.title}» kitobi ${student.firstName} ${student.lastName}ga muvaffaqiyatli berildi.`,
      data: newBorrow
    });
  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Kitobni qabul qilib olish (Return / Check-in) va Taqriz (Review) qoldirish
router.post('/return', async (req, res) => {
  try {
    const { borrowId, isFinished = true, rating = 5, comment = '', notes = '' } = req.body;

    if (!borrowId) {
      return res.status(400).json({ success: false, error: 'Ijara ID si kiritilmadi' });
    }

    const bId = parseInt(borrowId);

    const borrow = await prisma.borrow.findUnique({
      where: { id: bId },
      include: { book: true, student: true }
    });

    if (!borrow) {
      return res.status(404).json({ success: false, error: 'Ijara yozuvi topilmadi' });
    }

    if (borrow.status === 'RETURNED') {
      return res.status(400).json({ success: false, error: 'Ushbu kitob allaqachon topshirilgan' });
    }

    const returnDate = new Date();

    // 1. Ijara holatini yangilash
    const updatedBorrow = await prisma.borrow.update({
      where: { id: bId },
      data: {
        status: 'RETURNED',
        returnDate,
        isFinished: Boolean(isFinished),
        notes: notes ? (borrow.notes ? `${borrow.notes} | ${notes}` : notes) : borrow.notes
      }
    });

    // 2. Kitob holatini yana AVAILABLE qilish
    await prisma.book.update({
      where: { id: borrow.bookId },
      data: { status: 'AVAILABLE' }
    });

    // 3. Agar taqriz/xulosa matni yoki baho kiritilgan bo'lsa Review yaratish
    let createdReview = null;
    if (comment && comment.trim() !== '') {
      createdReview = await prisma.review.create({
        data: {
          borrowId: bId,
          bookId: borrow.bookId,
          studentId: borrow.studentId,
          rating: Math.min(5, Math.max(1, parseInt(rating) || 5)),
          comment: comment.trim(),
          isFeatured: true
        }
      });
    }

    res.json({
      success: true,
      message: `«${borrow.book.title}» kitobi qabul qilindi va holati BO'SH deb belgilandi.`,
      data: {
        borrow: updatedBorrow,
        review: createdReview
      }
    });
  } catch (error) {
    console.error('Error during return:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
