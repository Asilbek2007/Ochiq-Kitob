const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Uploads papkasini tayyorlash
const uploadsDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer saqlash sozlamasi
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `book-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari (JPG, PNG, WEBP, GIF, SVG) ruxsat etiladi!'));
    }
  }
});

// Rasm yuklash API (POST /api/books/upload)
router.post('/upload', (req, res) => {
  upload.single('coverImage')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message || 'Fayl yuklashda xatolik!' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Rasm fayli tanlanmadi!' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      message: 'Rasm muvaffaqiyatli yuklandi!',
      url: fileUrl
    });
  });
});

// 1. Barcha kitoblarni olish (Nusxalar hisobi, qidiruv va filtrlash bilan)
router.get('/', async (req, res) => {
  try {
    const { search, category, status } = req.query;

    const where = {};

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { author: { contains: q } },
        { inventoryNo: { contains: q } },
        { category: { contains: q } }
      ];
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    const books = await prisma.book.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        borrows: {
          where: { status: 'ACTIVE' },
          include: {
            student: true
          }
        },
        reviews: {
          include: {
            student: true
          },
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      }
    });

    // Nusxalar holatini dinamik hisoblash
    const mappedBooks = books.map(book => {
      const activeBorrowsCount = book.borrows ? book.borrows.length : 0;
      const total = book.totalCopies || 4;
      const available = Math.max(0, total - activeBorrowsCount);
      const isAvailable = available > 0;

      return {
        ...book,
        totalCopies: total,
        borrowedCopies: activeBorrowsCount,
        availableCopies: available,
        status: isAvailable ? 'AVAILABLE' : 'BORROWED'
      };
    });

    // Status bo'yicha filtrlash (agar AVAILABLE yoki BORROWED so'ralsa)
    let filtered = mappedBooks;
    if (status && status !== 'ALL') {
      filtered = mappedBooks.filter(b => b.status === status);
    }

    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ success: false, error: 'Kitoblarni yuklashda xatolik yuz berdi' });
  }
});

// 2. Kategoriya / Janrlar ro'yxatini olish
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.book.findMany({
      select: { category: true },
      distinct: ['category']
    });
    res.json({ success: true, data: categories.map(c => c.category) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Yagona kitobni batafsil olish
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        reviews: {
          include: { student: true },
          orderBy: { createdAt: 'desc' }
        },
        borrows: {
          include: { student: true },
          orderBy: { borrowDate: 'desc' },
          take: 10
        }
      }
    });

    if (!book) {
      return res.status(404).json({ success: false, error: 'Kitob topilmadi' });
    }

    const activeBorrows = book.borrows.filter(b => b.status === 'ACTIVE');
    const total = book.totalCopies || 4;
    const available = Math.max(0, total - activeBorrows.length);

    res.json({
      success: true,
      data: {
        ...book,
        totalCopies: total,
        borrowedCopies: activeBorrows.length,
        availableCopies: available,
        status: available > 0 ? 'AVAILABLE' : 'BORROWED'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Yangi kitob qo'shish (Admin)
router.post('/', async (req, res) => {
  try {
    const { title, author, category, inventoryNo, pageCount, totalCopies = 4, description, coverUrl } = req.body;

    if (!title || !author) {
      return res.status(400).json({ success: false, error: 'Kitob nomi va muallifi kiritilishi shart' });
    }

    let inv = inventoryNo;
    if (!inv || inv.trim() === '') {
      const count = await prisma.book.count();
      inv = `OK-${String(count + 1).padStart(4, '0')}`;
    }

    const defaultCover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

    const newBook = await prisma.book.create({
      data: {
        title: title.trim(),
        author: author.trim(),
        category: category?.trim() || 'Badiiy adabiyot',
        inventoryNo: inv.trim(),
        pageCount: pageCount ? parseInt(pageCount) : 0,
        totalCopies: parseInt(totalCopies) || 4,
        description: description?.trim() || '',
        coverUrl: coverUrl?.trim() || defaultCover,
        status: 'AVAILABLE'
      }
    });

    res.status(201).json({ success: true, message: 'Kitob muvaffaqiyatli qo\'shildi', data: newBook });
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Kitobni tahrirlash (Admin)
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, author, category, inventoryNo, pageCount, totalCopies, description, coverUrl, status } = req.body;

    const updated = await prisma.book.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(author && { author: author.trim() }),
        ...(category && { category: category.trim() }),
        ...(inventoryNo && { inventoryNo: inventoryNo.trim() }),
        ...(pageCount !== undefined && { pageCount: parseInt(pageCount) }),
        ...(totalCopies !== undefined && { totalCopies: parseInt(totalCopies) }),
        ...(description !== undefined && { description: description.trim() }),
        ...(coverUrl !== undefined && { coverUrl: coverUrl.trim() }),
        ...(status && { status })
      }
    });

    res.json({ success: true, message: 'Kitob ma\'lumotlari yangilandi', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Kitobni o'chirish (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const activeBorrow = await prisma.borrow.findFirst({
      where: { bookId: id, status: 'ACTIVE' }
    });

    if (activeBorrow) {
      return res.status(400).json({
        success: false,
        error: 'Ushbu kitob bo\'yicha faol ijaralar mavjud. Avval kitobni qabul qiling.'
      });
    }

    await prisma.book.delete({ where: { id } });
    res.json({ success: true, message: 'Kitob o\'chirildi' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
