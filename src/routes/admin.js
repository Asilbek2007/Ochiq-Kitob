const express = require('express');
const router = express.Router();

const ADMIN_SECRET_PATH = process.env.ADMIN_SECRET_PATH || 'kutubxona-boshqaruv';

// Admin login
router.post('/login', (req, res) => {
  const { password } = req.body;
  const correctPassword = process.env.ADMIN_PASSWORD || 'Ilmamal03';

  if (password === correctPassword) {
    req.session.isAdmin = true;
    req.session.adminLoginTime = new Date().toISOString();
    return res.json({ 
      success: true, 
      message: 'Tizimga muvaffaqiyatli kirdingiz!',
      redirectUrl: `/${ADMIN_SECRET_PATH}/panel`
    });
  }

  return res.status(401).json({ 
    success: false, 
    error: 'Noto\'g\'ri parol! Qaytadan urinib ko\'ring.' 
  });
});

// Admin logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: 'Tizimdan chiqdingiz.' });
  });
});

// Admin auth tekshirish
router.get('/check', (req, res) => {
  res.json({ 
    isAdmin: !!(req.session && req.session.isAdmin),
    loginTime: req.session?.adminLoginTime || null
  });
});

module.exports = router;
