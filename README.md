# OchiqKitob (OpenBook) 📚

> **"Ushbu kutubxona marhum Chorshanbiyev Bekmurod xotirasiga bag'ishlab yaratildi. Undan olingan har bir ilm va manfaat u kishining ruhi poklariga sadaqai joriya bo'lsin."**

---

## 🌐 Loyiha haqida

**OchiqKitob** — maktab kutubxonasi uchun to'liq dinamik boshqaruv tizimi va jamoat veb-sayti.

- 📖 **Jamoat sahifasi** — Kitoblar katalogi, reyting, statistika, Telegram kanal
- 🔒 **Admin panel** — Maxfiy URL orqali, parol bilan himoyalangan
- 🤖 **Telegram bot** — Har kuni ertalab 08:00 da avtomatik hisobot
- 📊 **Real vaqt statistika** — 91,752+ ijara, 12,000+ kitobxon, 8,258+ kitob

---

## 🛠️ Texnologik Stek

| Qatlam | Texnologiya |
|--------|-------------|
| Backend | Node.js + Express.js |
| Ma'lumotlar bazasi | SQLite + Prisma ORM |
| Frontend | Tailwind CSS + Vanilla JS |
| Bot | Telegram Bot API (native https) |
| Sessiya | express-session |

---

## 🚀 O'rnatish va ishga tushirish

### 1. Repozitoriyni klonlash
```bash
git clone https://github.com/Asilbek2007/Ochiq-Kitob.git
cd Ochiq-Kitob
```

### 2. Paketlarni o'rnatish
```bash
npm install
```

### 3. `.env` faylini sozlash
```bash
cp .env.example .env
```
`.env` faylini oching va quyidagilarni to'ldiring:
```
ADMIN_PASSWORD="o'zingizning_parolingiz"
SESSION_SECRET="tasodifiy_maxfiy_kalit"
TELEGRAM_BOT_TOKEN="botning_tokeni"
TELEGRAM_CHANNEL_ID="@kanalingiz"
```

### 4. Ma'lumotlar bazasini yaratish
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Serverni ishga tushirish
```bash
node src/server.js
```

---

## 🔗 Sahifalar

| URL | Tavsif |
|-----|--------|
| `http://localhost:3000` | Bosh sahifa |
| `http://localhost:3000/kitoblar.html` | Kitoblar katalogi |
| `http://localhost:3000/reyting.html` | Top kitoblar va kitobxonlar |
| `http://localhost:3000/kutubxona-boshqaruv` | Admin panel (parol kerak) |

---

## 🤖 Telegram Bot

- Bot: **@ochiqkitobuz_bot**
- Kanal: **@ochiqkitobuz**
- Hisobot vaqti: **Har kuni soat 08:00** (Toshkent vaqti)

---

## 📁 Loyiha tuzilmasi

```
ochiq-kitob/
├── prisma/
│   ├── schema.prisma    # Ma'lumotlar bazasi sxemasi
│   └── seed.js          # Dastlabki ma'lumotlar
├── public/
│   ├── css/style.css    # Asosiy stil
│   ├── js/              # Frontend skriptlar
│   ├── images/          # Logotip va rasmlar
│   ├── index.html       # Bosh sahifa
│   ├── kitoblar.html    # Katalog
│   ├── reyting.html     # Reyting
│   ├── login.html       # Admin kirish
│   └── panel.html       # Admin panel
├── src/
│   ├── routes/          # API yo'nalishlari
│   ├── services/        # Telegram bot, Cron
│   └── server.js        # Asosiy server
├── .env.example         # .env namunasi
├── .gitignore
└── package.json
```

---

## 📜 Litsenziya

MIT License — Barchaga ochiq va bepul. 💚
