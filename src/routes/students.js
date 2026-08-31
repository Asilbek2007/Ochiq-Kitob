const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Barcha o'quvchilarni olish (Qidiruv bilan)
router.get('/', async (req, res) => {
  try {
    const { search, grade } = req.query;
    const where = {};

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { phone: { contains: q } }
      ];
    }

    if (grade && grade !== 'ALL') {
      where.grade = grade;
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { firstName: 'asc' },
      include: {
        borrows: {
          include: { book: true },
          orderBy: { borrowDate: 'desc' }
        },
        reviews: true
      }
    });

    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, error: 'O\'quvchilarni yuklashda xatolik' });
  }
});

// 2. Yagona o'quvchi profili va o'qish tarixi
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        borrows: {
          include: { book: true, review: true },
          orderBy: { borrowDate: 'desc' }
        },
        reviews: {
          include: { book: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'O\'quvchi topilmadi' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Yangi o'quvchi qo'shish
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, grade, phone } = req.body;

    if (!firstName || !lastName || !grade) {
      return res.status(400).json({
        success: false,
        error: 'Ism, Familiya va Sinf kiritilishi shart'
      });
    }

    const newStudent = await prisma.student.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        grade: grade.trim(),
        phone: phone ? phone.trim() : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'O\'quvchi muvaffaqiyatli ro\'yxatdan o\'tkazildi',
      data: newStudent
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. O'quvchini tahrirlash
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { firstName, lastName, grade, phone } = req.body;

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...(firstName && { firstName: firstName.trim() }),
        ...(lastName && { lastName: lastName.trim() }),
        ...(grade && { grade: grade.trim() }),
        ...(phone !== undefined && { phone: phone ? phone.trim() : null })
      }
    });

    res.json({ success: true, message: 'O\'quvchi ma\'lumotlari yangilandi', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. O'quvchini o'chirish
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const activeBorrows = await prisma.borrow.findFirst({
      where: { studentId: id, status: 'ACTIVE' }
    });

    if (activeBorrows) {
      return res.status(400).json({
        success: false,
        error: 'O\'quvchida qaytarilmagan kitoblar mavjud! Avval kitobni qabul qiling.'
      });
    }

    await prisma.student.delete({ where: { id } });
    res.json({ success: true, message: 'O\'quvchi o\'chirildi' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
