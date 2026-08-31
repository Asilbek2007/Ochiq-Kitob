const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');

dotenv.config();

const { initCronJobs } = require('./services/cronService');

// Routers
const booksRouter = require('./routes/books');
const studentsRouter = require('./routes/students');
const borrowsRouter = require('./routes/borrows');
const statsRouter = require('./routes/stats');
const telegramRouter = require('./routes/telegram');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET_PATH = process.env.ADMIN_SECRET_PATH || 'kutubxona-boshqaruv';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'ochiqkitob-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true if using HTTPS
    maxAge: 8 * 60 * 60 * 1000 // 8 soat
  }
}));

// Static public files — admin.html ga kirish BLOKLANGAN
app.use(express.static(path.join(__dirname, '../public'), {
  // admin.html ni bevosita staticdan yashiramiz
  index: false,
  setHeaders: (res, filePath) => {
    // admin.html ni static orqali bermaslik
  }
}));

// Public static fayl berish (admin.html bundan mustasno)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/kitoblar.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/kitoblar.html'));
});

app.get('/reyting.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/reyting.html'));
});

// ADMIN yashirin URL — /admin.html ni BLOKLASH
app.get('/admin.html', (req, res) => {
  res.redirect('/');
});

app.get('/admin', (req, res) => {
  res.redirect('/');
});

// API Routes
app.use('/api/books', booksRouter);
app.use('/api/students', studentsRouter);
app.use('/api/borrows', borrowsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/telegram', telegramRouter);

// Admin Panel maxfiy routes
app.use('/api/admin', adminRouter);

// Admin login sahifasi — maxfiy URL orqali kirish
app.get(`/${ADMIN_SECRET_PATH}`, (req, res) => {
  if (req.session && req.session.isAdmin) {
    // Allaqachon tizimga kirgan — admin panelga yo'naltirish
    res.sendFile(path.join(__dirname, '../public/panel.html'));
  } else {
    // Login sahifasini ko'rsatish
    res.sendFile(path.join(__dirname, '../public/login.html'));
  }
});

// Admin panel HTML (faqat tizimga kirganlar uchun)
app.get(`/${ADMIN_SECRET_PATH}/panel`, (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect(`/${ADMIN_SECRET_PATH}`);
  }
  res.sendFile(path.join(__dirname, '../public/panel.html'));
});

// Fallback health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'OchiqKitob (OpenBook)',
    timestamp: new Date().toISOString()
  });
});

// Fallback — 404
app.use((req, res) => {
  res.status(404).redirect('/');
});

// Start Cron background jobs
initCronJobs();

// Start Server
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`✅  OchiqKitob (OpenBook) tizimi ishga tushdi!`);
  console.log(`🌐  Jamoat sahifasi: http://localhost:${PORT}`);
  console.log(`🔒  Admin panel:     http://localhost:${PORT}/${ADMIN_SECRET_PATH}`);
  console.log(`🔑  Parol: ${process.env.ADMIN_PASSWORD}`);
  console.log('====================================================');
});
