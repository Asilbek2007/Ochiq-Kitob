const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 OchiqKitob kengaytirilgan ma\'lumotlar bazasini tozalash va to\'ldirish boshlandi...');

  // Eski ma'lumotlarni tozalash
  await prisma.review.deleteMany();
  await prisma.borrow.deleteMany();
  await prisma.book.deleteMany();
  await prisma.student.deleteMany();
  await prisma.admin.deleteMany();

  // 1. Admin yaratish
  await prisma.admin.create({
    data: {
      username: 'admin',
      password: 'admin123_ochiqkitob',
      name: 'Kutubxona Mudiri',
      role: 'ADMIN'
    }
  });

  // 2. Top 100 Kitoblar ro'yxati (Foydalanuvchi taqdim etgan to'liq ro'yxat)
  const top100Raw = [
    { title: "Men (Bas qil, ey nafs)", count: 1382, author: "Salohiddin Sharipov", cat: "Ruhiy tarbiya / Nafs" },
    { title: "Saodat asri qissalari 1-juz", count: 1129, author: "Ahmad Lutfiy Qozonchi", cat: "Siyrat / Islomiy" },
    { title: "Iymon", count: 999, author: "Shayx Muhammad Sodiq Muhammad Yusuf", cat: "Aqiyda / Islomiy" },
    { title: "Atom odatlar", count: 931, author: "Jeyms Klir", cat: "Shaxsiy rivojlanish" },
    { title: "Sir (Oshiqlar o'lmas!)", count: 756, author: "Jaloliddin Rumiy", cat: "Falsafa / Ma'rifat" },
    { title: "Baxtiyor oila", count: 701, author: "Shayx Muhammad Sodiq Muhammad Yusuf", cat: "Oila / Tarbiya" },
    { title: "Ruhiy tarbiya 1-juz", count: 696, author: "Shayx Muhammad Sodiq Muhammad Yusuf", cat: "Ruhiy tarbiya" },
    { title: "Qalb iffati", count: 651, author: "Doktor Mahmud Misriy", cat: "Axloq / Tarbiya" },
    { title: "Saodat asri qissalari 2-juz", count: 648, author: "Ahmad Lutfiy Qozonchi", cat: "Siyrat / Islomiy" },
    { title: "Mukoshafatul qulub", count: 640, author: "Imom G'azzoliy", cat: "Axloq / Ma'rifat" },
    { title: "Yashamoq (ko'z yoshlarga g'arq qilgan asar)", count: 629, author: "Yuy Xua", cat: "Jahon adabiyoti / Roman" },
    { title: "Ulamolar nazdida vaqtning qadri", count: 626, author: "Abdulfattoh Abu G'udda", cat: "Ilm / Ma'rifat" },
    { title: "Qulog'im senda, qizim", count: 593, author: "Doktor Hassan Shamsi Posho", cat: "Qizlar tarbiyasi" },
    { title: "Ilm olish sirlari", count: 542, author: "Imom Zarnujiy", cat: "Ilm / Odob" },
    { title: "Halqa", count: 534, author: "Akrom Malik", cat: "Badiiy qissa" },
    { title: "Afv et, Allohim", count: 525, author: "Doktor Mahmud Misriy", cat: "Tavba / Zikr" },
    { title: "Payg'ambarlar tarixi 1", count: 454, author: "Ahmad Lutfiy Qozonchi", cat: "Tarix / Siyrat" },
    { title: "Men Robiya", count: 449, author: "Nuriya Chelebi", cat: "Badiiy / Qissa" },
    { title: "Savdogarlar ustozi yoxud haqiqiy omad kaliti", count: 449, author: "Ahmad Lutfiy Qozonchi", cat: "Biznes / Hayot" },
    { title: "Izlash", count: 445, author: "Mehmet Yildiz", cat: "Falsafiy qissa" },
    { title: "Ijtimoiy odoblar", count: 442, author: "Shayx Muhammad Sodiq Muhammad Yusuf", cat: "Odob-axloq" },
    { title: "Yosh qizga nasihat", count: 429, author: "Shayx Badr ibn Ali", cat: "Tarbiyaviy" },
    { title: "Har bir ayol Hojardir", count: 423, author: "Sara Jala", cat: "Ayollar adabiyoti" },
    { title: "Tafsiri hilol 1-juz", count: 418, author: "Shayx Muhammad Sodiq Muhammad Yusuf", cat: "Tafsir" },
    { title: "Saodat asri qissalari 3-juz", count: 416, author: "Ahmad Lutfiy Qozonchi", cat: "Siyrat / Islomiy" },
    { title: "Sohilsiz dengiz", count: 413, author: "Ahmad Lutfiy Qozonchi", cat: "Siyrat" },
    { title: "Amallar niyatga bog'liqdir", count: 387, author: "Doktor Umar Sulaymon Ashqar", cat: "Aqiyda" },
    { title: "Diqqat", count: 381, author: "Kel Nyuport", cat: "Shaxsiy rivojlanish" },
    { title: "Muqaddima (Ibn Xaldun)", count: 377, author: "Ibn Xaldun", cat: "Tarix / Sotsiologiya" },
    { title: "Farzand tarbiyalash siri", count: 367, author: "Muhammad Nur Abdulhafiz Suvayd", cat: "Oila / Tarbiya" },
    { title: "O'tkan kunlar", count: 366, author: "Abdulla Qodiriy", cat: "O'zbek mumtoz romani" },
    { title: "Bugun bomdod o'qidingizmi?!", count: 364, author: "Roshid al-Afasiy", cat: "Ibodat" },
    { title: "Chunki Sen Allohsan", count: 354, author: "Ali Jobir Fayfiy", cat: "Allohning go'zal ismlari" },
    { title: "Ar-rahiq al-maxtum (Muhrlangan jannat sharobi)", count: 351, author: "Safiurrahmon Muborakpuriy", cat: "Siyrat" },
    { title: "Qo'rqma", count: 345, author: "Javlon Jovliyev", cat: "Badiiy roman" },
    { title: "Halol luqma", count: 335, author: "Doktor Mahmud Misriy", cat: "Halol hayot" },
    { title: "Tarixi Muhammadiy (asarning asl va to'liq nashri)", count: 327, author: "Alixonto'ra Sog'uniy", cat: "Siyrat / Tarix" },
    { title: "Ibodati islomiya", count: 323, author: "Ahmad Hodiy Maqsudiy", cat: "Fiqh / Ibodat" },
    { title: "Islom tarixi 1-kitob", count: 317, author: "Shayx Muhammad Sodiq Muhammad Yusuf", cat: "Tarix" },
    { title: "Ikki eshik orasi", count: 315, author: "O'tkir Hoshimov", cat: "O'zbek adabiyoti" },
    { title: "Qalbning davosi", count: 311, author: "Ibn Qayyim al-Javziyya", cat: "Ruhiy tarbiya" },
    { title: "Nasroniy atirguli", count: 308, author: "Ahmad Lutfiy Qozonchi", cat: "Badiiy qissa" },
    { title: "Bu ummatning qizi", count: 302, author: "Maryam Jamilah", cat: "Ayollar adabiyoti" },
    { title: "Kifoya 1-juz", count: 301, author: "Shayx Muhammad Sodiq Muhammad Yusuf", cat: "Fiqh" },
    { title: "Mo'minning me'roji - mufassal namoz kitobi", count: 298, author: "Shayx Muhammad Sodiq", cat: "Namoz" },
    { title: "Alloh bilan ko'ngil suhbati - namoz", count: 297, author: "Ahmad Lutfiy Qozonchi", cat: "Namoz / Xushuv" },
    { title: "Fotimaning bolasi", count: 292, author: "Nuriya Chelebi", cat: "Tarbiyaviy qissa" },
    { title: "Muqaddima. Hadis va hayot 1-juz", count: 289, author: "Shayx Muhammad Sodiq Muhammad Yusuf", cat: "Hadis" },
    { title: "Lol", count: 288, author: "Dilorom Karimova", cat: "Qissa" },
    { title: "Saodat asri qissalari 4-juz", count: 281, author: "Ahmad Lutfiy Qozonchi", cat: "Siyrat" },
    { title: "Til ofatlari (tilning 20 ofati)", count: 280, author: "Imom G'azzoliy", cat: "Axloq" },
    { title: "Nabaviy tarbiya", count: 279, author: "Muhammad Ali Hoshimiy", cat: "Pedagogika" },
    { title: "Ruhiy tarbiya 2-juz", count: 272, author: "Shayx Muhammad Sodiq", cat: "Ruhiy tarbiya" },
    { title: "Tushda kechgan umrlar", count: 268, author: "O'tkir Hoshimov", cat: "Roman" },
    { title: "Imomning maneken qizi", count: 263, author: "Amina Shenliko'g'li", cat: "Roman" },
    { title: "Qiyomat va oxirat", count: 251, author: "Imom G'azzoliy", cat: "Aqiyda" },
    { title: "Alloh sari yigirma bekat", count: 249, author: "Mahmud As'ad Jo'shon", cat: "Tasavvuf" },
    { title: "Tarixi Muhammadiy", count: 242, author: "Alixonto'ra Sog'uniy", cat: "Siyrat" },
    { title: "Sof tabiat dini", count: 240, author: "Shayx Muhammad Sodiq", cat: "Aqiyda" },
    { title: "Odoblar xazinasi 1-juz", count: 233, author: "Shayx Muhammad Sodiq Muhammad Yusuf", cat: "Hadis" },
    { title: "Kafansiz ko'milganlar", count: 229, author: "Shukrullo", cat: "Tarixiy xotiralar" },
    { title: "Niyat, ixlos, ilm. Hadis va hayot 3-juz", count: 227, author: "Shayx Muhammad Sodiq", cat: "Hadis" },
    { title: "Ichindagi Ichindadur", count: 227, author: "Jaloliddin Rumiy", cat: "Falsafa" },
    { title: "O'kinma", count: 227, author: "Doktor Oiz Qarniy", cat: "Psixologiya" },
    { title: "Allohga qoching!", count: 226, author: "Doktor Mahmud Misriy", cat: "Tavba" },
    { title: "Sunniy aqiydalar", count: 220, author: "Shayx Muhammad Sodiq", cat: "Aqiyda" },
    { title: "Chunki Sen borsan, Alloh", count: 220, author: "Ali Jobir Fayfiy", cat: "Zikr" },
    { title: "Fantom og'rig'i", count: 219, author: "Yulduz Usmonova", cat: "Qissa" },
    { title: "Alkimyogar", count: 218, author: "Paulo Koelo", cat: "Jahon adabiyoti" },
    { title: "Suyukli Payg'ambarim bilan 365 kun (lotin)", count: 217, author: "Nurdan Damla", cat: "Bolalar / Siyrat" },
    { title: "Suyukli Qur'on kitobi bilan 365 kun", count: 206, author: "Nurdan Damla", cat: "Bolalar adabiyoti" },
    { title: "Savdogarlar ustozi 2", count: 201, author: "Ahmad Lutfiy Qozonchi", cat: "Biznes" },
    { title: "Martin Iden", count: 199, author: "Jek London", cat: "Klassik roman" },
    { title: "Iymon va huzun", count: 197, author: "Shayx Muhammad Sodiq", cat: "Iymon" },
    { title: "Mehrobdan chayon", count: 196, author: "Abdulla Qodiriy", cat: "Tarixiy roman" },
    { title: "Hayot yutqazgan joyingdan boshlanar", count: 196, author: "Miraç Çağrı Aktaş", cat: "Psixologiya" },
    { title: "Islom va iymon. Hadis va hayot 2-juz", count: 194, author: "Shayx Muhammad Sodiq", cat: "Hadis" },
    { title: "Falastin: Agar o'lishim lozim bo'lsa...", count: 193, author: "Rifat Alareer", cat: "Hujjatli" },
    { title: "Yo nasib!..", count: 191, author: "Sinan Akyuz", cat: "Roman" },
    { title: "Ey farzand", count: 189, author: "Imom G'azzoliy", cat: "Nasihat" },
    { title: "Mamlakatlar tanazzuli sabablari", count: 189, author: "Daron Ajemo'g'li", cat: "Iqtisod / Siyosat" },
    { title: "Olam va odam din va ilm", count: 185, author: "Shayx Muhammad Sodiq", cat: "Ilm-fan" },
    { title: "Mo'minning qalqoni", count: 184, author: "Shayx Muhammad Sodiq", cat: "Zikr" },
    { title: "Baqirmaydigan onalar", count: 181, author: "Hatice Kübra Tongar", cat: "Ona va bola" },
    { title: "Biz gunohdan qanday saqlanamiz?", count: 181, author: "Doktor Mahmud Misriy", cat: "Taqvo" },
    { title: "Xayrlisi", count: 179, author: "Uğur Koşar", cat: "Psixologiya" },
    { title: "Molxona", count: 178, author: "Jorj Oruell", cat: "Satira" },
    { title: "Tafsiri hilol 6-juz", count: 177, author: "Shayx Muhammad Sodiq", cat: "Tafsir" },
    { title: "Asharai mubashshara", count: 175, author: "Ahmad Lutfiy Qozonchi", cat: "Sahobalar" },
    { title: "Dunyoning ishlari", count: 174, author: "O'tkir Hoshimov", cat: "Qissalar" },
    { title: "Jinoyat va jazo", count: 174, author: "Fyodor Dostoyevskiy", cat: "Klassik roman" },
    { title: "Pir", count: 174, author: "Murat Çiftkaya", cat: "Tarixiy" },
    { title: "Atomic habits", count: 173, author: "James Clear", cat: "Ingliz tili / Rivojlanish" },
    { title: "Uchdan keyin kech", count: 171, author: "Masaru Ibuka", cat: "Bolalar psixologiyasi" },
    { title: "Duo taqdirni o'zgartiradi", count: 169, author: "Rashid Qosimiy", cat: "Duo" },
    { title: "Oisha (roziyallohu anho)", count: 167, author: "Ahmad Lutfiy Qozonchi", cat: "Siyrat" },
    { title: "Tafsiri hilol 30-juz", count: 166, author: "Shayx Muhammad Sodiq", cat: "Tafsir" },
    { title: "O'gay ona", count: 166, author: "Ahmad Lutfiy Qozonchi", cat: "Qissa" },
    { title: "Yaxshilik va silai rahm 1-juz", count: 165, author: "Shayx Muhammad Sodiq", cat: "Hadis" },
    { title: "Ihyou ulumid-din (Tavba, so'nggi manzil zikri)", count: 165, author: "Imom G'azzoliy", cat: "Tasavvuf / Axloq" }
  ];

  // Haftalik eng ko'p o'qilgan kitoblar (Top 30 haftalik)
  const weeklyTopRaw = [
    { title: "Samarali musulmon", weekly: 5, author: "Muhammad Foris", cat: "Shaxsiy rivojlanish" },
    { title: "Odam bo'lish qiyin", weekly: 4, author: "O'lmas Umarbekov", cat: "Roman" },
    { title: "Fotimaning bolasi", weekly: 4, author: "Nuriya Chelebi", cat: "Tarbiyaviy" },
    { title: "Halqa", weekly: 4, author: "Akrom Malik", cat: "Badiiy qissa" },
    { title: "Baxtiyor oila", weekly: 4, author: "Shayx Muhammad Sodiq", cat: "Oila" },
    { title: "Otamdan qolgan dalalar", weekly: 4, author: "Tog'ay Murod", cat: "Milliy roman" },
    { title: "Yashamoq (ko'z yoshlarga g'arq qilgan asar)", weekly: 4, author: "Yuy Xua", cat: "Roman" },
    { title: "Kafansiz ko'milganlar", weekly: 4, author: "Shukrullo", cat: "Tarixiy" },
    { title: "U shunday Allohki, ...", weekly: 3, author: "Ali Jobir Fayfiy", cat: "Ma'rifat" },
    { title: "Olimlarning ayollari", weekly: 3, author: "Salohiddin Ali", cat: "Tarix" },
    { title: "Qulog'im senda, qizim", weekly: 3, author: "Hassan Shamsi", cat: "Tarbiyaviy" },
    { title: "Yosh qizga nasihat", weekly: 3, author: "Shayx Badr", cat: "Nasihat" },
    { title: "Sen onang kabi emassan", weekly: 3, author: "Xadicha Kubro", cat: "Ayollar" },
    { title: "Afv et, Allohim", weekly: 3, author: "Doktor Mahmud Misriy", cat: "Tavba" },
    { title: "Harvard metodi", weekly: 3, author: "Uilyam Yuri", cat: "Muzokara" },
    { title: "Binafsha shu'lasi", weekly: 3, author: "Javlon Jovliyev", cat: "Badiiy" },
    { title: "Tafsiri hilol 1-juz", weekly: 3, author: "Shayx Muhammad Sodiq", cat: "Tafsir" },
    { title: "Qur'ondan maktublar", weekly: 3, author: "Doktor Hassan", cat: "Tafakkur" },
    { title: "Savdogarlar ustozi 2", weekly: 3, author: "Ahmad Lutfiy", cat: "Biznes" },
    { title: "Men (Bas qil, ey nafs)", weekly: 3, author: "Salohiddin Sharipov", cat: "Ruhiy tarbiya" },
    { title: "O'qing, ey ayollar!", weekly: 3, author: "Rabiya Xotun", cat: "Ma'rifat" },
    { title: "Dard etma, Alloh yetar", weekly: 2, author: "Uğur Koşar", cat: "Psixologiya" },
    { title: "Nafs tarbiyasi (G'azzoliy)", weekly: 2, author: "Imom G'azzoliy", cat: "Axloq" },
    { title: "Dunyodagi eng baxtli ayol", weekly: 2, author: "Oiz Qarniy", cat: "Ayollar" },
    { title: "Aso", weekly: 2, author: "Mirkarim Osim", cat: "Tarixiy" },
    { title: "1984 - Jorj Oruell", weekly: 2, author: "Jorj Oruell", cat: "Distopiya" },
    { title: "Payg'ambarlar tarixi 1", weekly: 2, author: "Ahmad Lutfiy", cat: "Siyrat" },
    { title: "Qaynoqqina ezgulik (ezgulik yo'lida-4)", weekly: 2, author: "Robiya Gul", cat: "Hikoyalar" },
    { title: "Alloh bilan ko'ngil suhbati - namoz", weekly: 2, author: "Ahmad Lutfiy", cat: "Namoz" },
    { title: "Ruhiy tarbiya 1-juz", weekly: 2, author: "Shayx Muhammad Sodiq", cat: "Ruhiy tarbiya" }
  ];

  // Rasm to'plamlari
  const covers = [
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80'
  ];

  console.log('📚 Top 100 kitoblar bazaga kiritilmoqda...');
  const createdBooks = [];
  for (let i = 0; i < top100Raw.length; i++) {
    const item = top100Raw[i];
    const weeklyItem = weeklyTopRaw.find(w => w.title.toLowerCase() === item.title.toLowerCase());
    const weeklyCount = weeklyItem ? weeklyItem.weekly : Math.floor(Math.random() * 2);

    // Multi-copies: 3 dan 6 tagacha nusxa
    const totalCopies = 4 + (i % 3); // 4, 5, yoki 6 nusxa

    const book = await prisma.book.create({
      data: {
        title: item.title,
        author: item.author || "Muallif",
        category: item.cat || "Badiiy adabiyot",
        inventoryNo: `OK-${String(i + 1).padStart(4, '0')}`,
        pageCount: 150 + ((i * 17) % 350),
        totalCopies: totalCopies,
        readCount: item.count,
        weeklyReadCount: weeklyCount,
        description: `«${item.title}» — kitobxonlar mehrini qozongan, inson ma'naviyatini yuksaltiruvchi va ilm ufqlarini kengaytiruvchi asar. Barcha kitobxonlarga mutolaa uchun tavsiya etiladi.`,
        coverUrl: covers[i % covers.length],
        status: (i === 1 || i === 4 || i === 9) ? 'BORROWED' : 'AVAILABLE'
      }
    });
    createdBooks.push(book);
  }

  // 3. Top 30 Kitobxonlar ro'yxati (Foydalanuvchi taqdim etgan to'liq ro'yxat)
  const top30ReadersRaw = [
    { name: "Yo'lchiyeva", count: 452, gender: "female", grade: "9-A" },
    { name: "Botirxo'jayeva", count: 296, gender: "female", grade: "10-B" },
    { name: "Xakimov", count: 206, gender: "male", grade: "8-A" },
    { name: "Mirolimova", count: 206, gender: "female", grade: "11-A" },
    { name: "Samadova", count: 201, gender: "female", grade: "9-B" },
    { name: "To'lyaganova", count: 194, gender: "female", grade: "7-A" },
    { name: "Jumaboyeva", count: 184, gender: "female", grade: "8-B" },
    { name: "Gafurova", count: 179, gender: "female", grade: "10-A" },
    { name: "Umarova", count: 163, gender: "female", grade: "6-A" },
    { name: "Boymuxamadova", count: 153, gender: "female", grade: "9-V" },
    { name: "Sadinova", count: 151, gender: "female", grade: "11-B" },
    { name: "Vahobov", count: 149, gender: "male", grade: "10-B" },
    { name: "Bozorboyeva", count: 148, gender: "female", grade: "7-B" },
    { name: "Najmiddinova", count: 147, gender: "female", grade: "8-V" },
    { name: "Rizayeva", count: 146, gender: "female", grade: "9-A" },
    { name: "Rahimberdiyeva", count: 145, gender: "female", grade: "10-V" },
    { name: "Usmonova", count: 139, gender: "female", grade: "8-A" },
    { name: "Toshtemirova", count: 138, gender: "female", grade: "9-B" },
    { name: "Raxmatullayeva", count: 134, gender: "female", grade: "11-A" },
    { name: "Yoqubov", count: 128, gender: "male", grade: "9-A" },
    { name: "Abdullayev", count: 126, gender: "male", grade: "8-B" },
    { name: "Shamshiriddinov", count: 124, gender: "male", grade: "10-A" },
    { name: "Fatxullayeva", count: 121, gender: "female", grade: "7-A" },
    { name: "Mavlanova", count: 121, gender: "female", grade: "8-A" },
    { name: "Ibrohimov", count: 120, gender: "male", grade: "11-B" },
    { name: "Qurbanbayeva", count: 113, gender: "female", grade: "9-A" },
    { name: "Hoshimov", count: 110, gender: "male", grade: "8-V" },
    { name: "Abdumutalipova", count: 109, gender: "female", grade: "10-A" },
    { name: "Shoniyozova", count: 107, gender: "female", grade: "7-B" },
    { name: "Mavlyanova", count: 106, gender: "female", grade: "9-V" }
  ];

  console.log('🧑🚀 Top 30 kitobxonlar bazaga kiritilmoqda...');
  const createdStudents = [];
  for (let i = 0; i < top30ReadersRaw.length; i++) {
    const r = top30ReadersRaw[i];
    const isFemale = r.gender === 'female';
    const firstNamesFemale = ['Madinabonu', 'Dilnoza', 'Zuhra', 'Fotima', 'Gulzoda', 'Nigora', 'Shahlo', 'Kamola', 'Zilola', 'Maftuna'];
    const firstNamesMale = ['Jasur', 'Azizbek', 'Bekzod', 'Sardor', 'Bobur', 'Farrux', 'Ulugbek', 'Otabek'];
    
    const firstName = isFemale ? firstNamesFemale[i % firstNamesFemale.length] : firstNamesMale[i % firstNamesMale.length];

    const student = await prisma.student.create({
      data: {
        firstName,
        lastName: r.name,
        gender: r.gender,
        grade: r.grade,
        phone: `+998 9${i % 9} ${100 + i * 3} ${20 + i} ${11 + (i % 80)}`,
        readCount: r.count
      }
    });
    createdStudents.push(student);
  }

  // 4. Namunaviy Faol va Yakunlangan Ijaralar & Sara Taqrizlar
  console.log('💬 Taqrizlar va ijaralar bog\'lanmoqda...');
  
  // Real reviews
  const reviewQuotes = [
    "«Men (Bas qil, ey nafs)» asari qalbimdagi barcha g'uborlarni yuvib tashladi. Nafs bilan kurashishning haqiqiy yo'lini ko'rsatib berdi.",
    "«Saodat asri qissalari»ni o'qib Rasululloh (s.a.v.) va sahobalarning buyuk jasorati, mehri va sabrini his qildim. Ko'z yoshsiz o'qib bo'lmaydi.",
    "«Iymon» kitobi har bir musulmon bilishi kerak bo'lgan asosiy aqiyda ruknlarini juda sodda va ilmiy tarzda tushuntirgan.",
    "«Atom odatlar» kitobi kundalik hayotimdagi kichik odatlarning katta natijalarga olib kelishini isbotladi. Rejamni butunlay o'zgartirdim.",
    "«Baxtiyor oila» asari orqali oiladagi tinchlik, ota-ona hurmati va farzand tarbiyasining muqaddas sirlarini o'rgandim.",
    "«Yashamoq» romanini o'qib inson hayotining eng og'ir sinovlarida ham yashashga bo'lgan umidini yo'qotmaslik kerakligini tushundim.",
    "«Qulog'im senda, qizim» qizlarimiz uchun eng go'zal hayotiy qo'llanma. Odob, iffat va ilmning go'zalligi yoritilgan."
  ];

  for (let i = 0; i < 7; i++) {
    const borrow = await prisma.borrow.create({
      data: {
        bookId: createdBooks[i].id,
        studentId: createdStudents[i].id,
        borrowDate: new Date(Date.now() - (10 + i) * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - (2 + i) * 24 * 60 * 60 * 1000),
        returnDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'RETURNED',
        isFinished: true,
        notes: 'To\'liq o\'qib topshirdi.'
      }
    });

    await prisma.review.create({
      data: {
        borrowId: borrow.id,
        bookId: createdBooks[i].id,
        studentId: createdStudents[i].id,
        rating: 5,
        comment: reviewQuotes[i % reviewQuotes.length],
        isFeatured: true
      }
    });
  }

  // Faol ijaralar (O'qilayotgan kitoblar)
  for (let i = 0; i < 3; i++) {
    await prisma.borrow.create({
      data: {
        bookId: createdBooks[i + 7].id,
        studentId: createdStudents[i + 7].id,
        borrowDate: new Date(Date.now() - (2 + i) * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + (5 - i) * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        isFinished: false,
        notes: 'Faol mutolaada.'
      }
    });
  }

  console.log('✅ Baza muvaffaqiyatli to\'ldirildi:');
  console.log(`- ${createdBooks.length} ta kitob (Top 100 to'liq)`);
  console.log(`- ${createdStudents.length} ta kitobxon (Top 30 to'liq)`);
  console.log(`- Taqrizlar, nusxalar va ijaralar integratsiya qilindi.`);
}

main()
  .catch((e) => {
    console.error('Xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
