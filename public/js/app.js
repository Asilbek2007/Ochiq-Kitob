// OchiqKitob — Public Portal Script

let currentCategory = 'ALL';
let currentStatus = 'ALL';
let searchQuery = '';
let monthlyChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  
  loadStats();
  loadCategories();
  loadBooks();
  setupEventListeners();
  setupFAQAccordion();
});

function setupEventListeners() {
  // Search input & button
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value;
      loadBooks();
    }, 250));

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchQuery = e.target.value;
        loadBooks();
        scrollToCatalog();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      searchQuery = searchInput.value;
      loadBooks();
      scrollToCatalog();
    });
  }

  // Status Filter Tabs
  document.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.status-filter-btn').forEach(b => {
        b.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
        b.classList.add('text-slate-600');
      });

      const target = e.currentTarget;
      target.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
      target.classList.remove('text-slate-600');

      currentStatus = target.dataset.status;
      loadBooks();
    });
  });

  // Modal close
  const closeModalBtn = document.getElementById('closeModalBtn');
  const bookModal = document.getElementById('bookModal');
  if (closeModalBtn && bookModal) {
    closeModalBtn.addEventListener('click', () => bookModal.classList.add('hidden'));
    bookModal.addEventListener('click', (e) => {
      if (e.target === bookModal) bookModal.classList.add('hidden');
    });
  }
}

function scrollToCatalog() {
  const el = document.getElementById('katalog');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function setupFAQAccordion() {
  document.querySelectorAll('.faq-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const content = button.nextElementSibling;
      const icon = button.querySelector('i');
      
      const isHidden = content.classList.contains('hidden');
      
      // Close other accordions
      document.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
      document.querySelectorAll('.faq-toggle i').forEach(i => i.style.transform = 'rotate(0deg)');

      if (isHidden) {
        content.classList.remove('hidden');
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    });
  });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 1. Jonli statistika va oylik grafikni yuklash
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const result = await res.json();

    if (result.success) {
      const { counters, topStudents, featuredReviews, chartData } = result.data;

      // Animate Main Counters
      animateFormattedNumber('statBooks', counters.totalBooks);
      animateFormattedNumber('statStudents', counters.totalStudents);
      animateFormattedNumber('statTotalBorrows', counters.totalBorrows);
      animateFormattedNumber('statActive', counters.activeBorrows);

      // Benchmarks
      document.getElementById('statDailyAvg').textContent = `${counters.dailyAvgBorrows} ta`;
      document.getElementById('statMonth').textContent = `${counters.monthBorrows.toLocaleString()} ta`;
      document.getElementById('statWeek').textContent = `${counters.weekBorrows.toLocaleString()} ta`;
      document.getElementById('stat24h').textContent = `${counters.last24hBorrows} ta`;

      renderTopStudents(topStudents);
      renderFeaturedReviews(featuredReviews);

      // Initialize Chart.js
      if (chartData && window.Chart) {
        renderMonthlyChart(chartData);
      }
    }
  } catch (error) {
    console.error('Stats loading error:', error);
  }
}

function animateFormattedNumber(elementId, targetNumber) {
  const el = document.getElementById(elementId);
  if (!el) return;

  let start = Math.floor(targetNumber * 0.75);
  const duration = 800;
  const steps = 30;
  const stepAmount = Math.max(1, Math.floor((targetNumber - start) / steps));

  const timer = setInterval(() => {
    start += stepAmount;
    if (start >= targetNumber) {
      el.textContent = targetNumber.toLocaleString();
      clearInterval(timer);
    } else {
      el.textContent = start.toLocaleString();
    }
  }, Math.floor(duration / steps));
}

function renderMonthlyChart(chartData) {
  const ctx = document.getElementById('monthlyChart');
  if (!ctx) return;

  if (monthlyChartInstance) {
    monthlyChartInstance.destroy();
  }

  monthlyChartInstance = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: 'Plus Jakarta Sans', size: 12 },
          bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10, family: 'Plus Jakarta Sans' }, color: '#64748b' }
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 10, family: 'Plus Jakarta Sans' }, color: '#64748b' }
        }
      }
    }
  });
}

// 2. Kategoriyalarni yuklash
async function loadCategories() {
  try {
    const res = await fetch('/api/books/categories');
    const result = await res.json();

    if (result.success && result.data) {
      const container = document.getElementById('categoryContainer');
      if (!container) return;

      container.innerHTML = `
        <button data-cat="ALL" class="category-pill whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-sm transition-all">
          Barcha Janrlar
        </button>
      `;

      result.data.slice(0, 10).forEach(cat => {
        const btn = document.createElement('button');
        btn.dataset.cat = cat;
        btn.className = 'category-pill whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all';
        btn.textContent = cat;
        container.appendChild(btn);
      });

      container.querySelectorAll('.category-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
          container.querySelectorAll('.category-pill').forEach(b => {
            b.className = 'category-pill whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all';
          });

          const target = e.currentTarget;
          target.className = 'category-pill whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-sm transition-all';

          currentCategory = target.dataset.cat;
          loadBooks();
        });
      });
    }
  } catch (error) {
    console.error('Categories load error:', error);
  }
}

// 3. Kitoblarni yuklash va render qilish (Multi-copy badges bilan)
async function loadBooks() {
  const booksGrid = document.getElementById('booksGrid');
  if (!booksGrid) return;

  try {
    let url = `/api/books?`;
    if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
    if (currentCategory !== 'ALL') url += `category=${encodeURIComponent(currentCategory)}&`;
    if (currentStatus !== 'ALL') url += `status=${encodeURIComponent(currentStatus)}&`;

    const res = await fetch(url);
    const result = await res.json();

    if (result.success) {
      if (result.data.length === 0) {
        booksGrid.innerHTML = `<div class="col-span-full py-16 text-center text-slate-400">Kitoblar topilmadi. Qidiruv so'zini o'zgartiring.</div>`;
        return;
      }

      renderBooksList(result.data.slice(0, 12));
    }
  } catch (error) {
    console.error('Books loading error:', error);
    booksGrid.innerHTML = `<div class="col-span-full py-8 text-center text-red-500">Kitoblarni yuklashda xatolik yuz berdi.</div>`;
  }
}

function renderBooksList(books) {
  const container = document.getElementById('booksGrid');
  if (!container) return;

  container.innerHTML = books.map(book => {
    const isAvailable = book.availableCopies > 0;
    const total = book.totalCopies || 4;
    const available = book.availableCopies || 0;
    const borrowed = book.borrowedCopies || 0;

    const statusBadge = isAvailable
      ? `<span class="badge-available px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
           <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
           BO'SH (${available} ta)
         </span>`
      : `<span class="badge-borrowed px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
           <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
           BAND (Barchasi)
         </span>`;

    const defaultCover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';
    const coverImage = book.coverUrl || defaultCover;

    return `
      <div class="glass-card rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm card-hover flex flex-col justify-between">
        <div>
          <!-- Image & Status Overlay -->
          <div class="relative h-56 bg-slate-100 overflow-hidden group">
            <img 
              src="${coverImage}" 
              alt="${book.title}" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onerror="this.src='${defaultCover}'"
            >
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent opacity-80"></div>
            
            <div class="absolute top-3 left-3">
              <span class="bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                ${book.inventoryNo || '№ OK'}
              </span>
            </div>

            <div class="absolute top-3 right-3">
              ${statusBadge}
            </div>

            <div class="absolute bottom-3 left-3 right-3 text-white">
              <span class="text-[11px] font-medium uppercase tracking-wider text-emerald-300">${book.category}</span>
            </div>
          </div>

          <!-- Body -->
          <div class="p-5">
            <h3 class="font-bold text-base text-slate-900 line-clamp-1 mb-1" title="${book.title}">
              ${book.title}
            </h3>
            <p class="text-xs text-slate-600 font-medium flex items-center gap-1.5 mb-3">
              <i data-lucide="feather" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>${book.author}</span>
            </p>

            <!-- Multi-copy indicator box -->
            <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs mb-3 flex items-center justify-between">
              <span class="text-slate-500 font-medium">Jami: <strong>${total} ta</strong></span>
              <div class="flex items-center gap-2 font-bold">
                <span class="text-emerald-700">🟢 ${available} bo'sh</span>
                <span class="text-amber-700">🔴 ${borrowed} band</span>
              </div>
            </div>

            <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              ${book.description || 'Ushbu kitob bo\'yicha qisqacha ma\'lumot kiritilmagan.'}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
          <div class="text-xs text-slate-500 font-mono">
            <span>${book.readCount || 0} marta o'qilgan</span>
          </div>

          <button 
            onclick="openBookModal(${book.id})" 
            class="px-3.5 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-medium rounded-xl text-xs transition-all flex items-center gap-1.5"
          >
            <span>Batafsil</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// 4. Modal orqali kitobni ko'rish
window.openBookModal = async function(bookId) {
  const modal = document.getElementById('bookModal');
  const modalContent = document.getElementById('modalContent');
  if (!modal || !modalContent) return;

  modal.classList.remove('hidden');
  modalContent.innerHTML = `<div class="py-12 text-center text-slate-400 text-sm">Yuklanmoqda...</div>`;

  try {
    const res = await fetch(`/api/books/${bookId}`);
    const result = await res.json();

    if (result.success && result.data) {
      const book = result.data;
      const defaultCover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

      let reviewsHtml = '';
      if (book.reviews && book.reviews.length > 0) {
        reviewsHtml = `
          <div class="mt-6 pt-6 border-t border-slate-200">
            <h4 class="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <i data-lucide="message-square" class="w-4 h-4 text-emerald-600"></i>
              Kitobxonlar taassurotlari (${book.reviews.length})
            </h4>
            <div class="space-y-3">
              ${book.reviews.map(r => `
                <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="font-semibold text-xs text-slate-800">${r.student.firstName} ${r.student.lastName} (${r.student.grade})</span>
                    <span class="text-amber-500 text-xs">${'★'.repeat(r.rating)}</span>
                  </div>
                  <p class="text-xs text-slate-600 italic">"${r.comment}"</p>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      modalContent.innerHTML = `
        <div class="flex flex-col sm:flex-row gap-6">
          <img 
            src="${book.coverUrl || defaultCover}" 
            alt="${book.title}" 
            class="w-full sm:w-44 h-60 object-cover rounded-2xl shadow-md"
            onerror="this.src='${defaultCover}'"
          >
          <div class="flex-1">
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              ${book.category}
            </span>

            <h3 class="text-2xl font-bold text-slate-900 font-serif-title mt-2 mb-1">${book.title}</h3>
            <p class="text-sm font-medium text-emerald-700 mb-4">${book.author}</p>

            <div class="grid grid-cols-3 gap-2 mb-4 text-center">
              <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span class="text-[10px] text-slate-400 block">Jami nusxalar</span>
                <span class="text-xs font-bold text-slate-800">${book.totalCopies} ta</span>
              </div>
              <div class="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                <span class="text-[10px] text-emerald-600 block">Mavjud (Bo'sh)</span>
                <span class="text-xs font-bold text-emerald-700">${book.availableCopies} ta</span>
              </div>
              <div class="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                <span class="text-[10px] text-amber-600 block">O'qilmoqda</span>
                <span class="text-xs font-bold text-amber-700">${book.borrowedCopies} ta</span>
              </div>
            </div>

            <p class="text-xs text-slate-600 leading-relaxed mb-2">
              ${book.description || 'Tavsif mavjud emas.'}
            </p>
            <span class="text-[11px] text-slate-400 block">Umumiy o'qilganlik: <strong>${book.readCount || 0} marta</strong></span>
          </div>
        </div>

        ${reviewsHtml}
      `;

      if (window.lucide) lucide.createIcons();
    }
  } catch (error) {
    modalContent.innerHTML = `<div class="text-red-500 text-sm">Ma'lumot yuklanmadi.</div>`;
  }
};

// 5. Top Kitobxonlarni render qilish
function renderTopStudents(topStudents) {
  const container = document.getElementById('topStudentsContainer');
  if (!container) return;

  if (!topStudents || topStudents.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center text-slate-400 text-sm">Hozircha reyting shakllanmadi.</div>`;
    return;
  }

  const medals = [
    { rank: '1', medal: '🥇', bg: 'from-amber-500 to-yellow-600', border: 'border-amber-300' },
    { rank: '2', medal: '🥈', bg: 'from-slate-400 to-slate-500', border: 'border-slate-300' },
    { rank: '3', medal: '🥉', bg: 'from-amber-700 to-amber-800', border: 'border-amber-700/30' },
  ];

  container.innerHTML = topStudents.slice(0, 3).map((item, idx) => {
    const m = medals[idx] || { rank: idx + 1, medal: '⭐', bg: 'from-emerald-600 to-emerald-700', border: 'border-emerald-200' };
    return `
      <div class="glass-card rounded-2xl p-6 border ${m.border} shadow-sm card-hover text-center relative overflow-hidden">
        <div class="text-3xl mb-2">${m.medal}</div>
        <span class="inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
          ${item.grade}-sinf
        </span>
        <h4 class="text-lg font-bold text-slate-900">${item.lastName} ${item.firstName}</h4>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2">
          <span class="text-2xl font-extrabold text-emerald-600">${item.readCount} ta</span>
          <span class="text-xs text-slate-500">kitob mutolaa qildi</span>
        </div>
      </div>
    `;
  }).join('');
}

// 6. Eng yaxshi taassurotlar
function renderFeaturedReviews(reviews) {
  const container = document.getElementById('reviewsContainer');
  if (!container) return;

  if (!reviews || reviews.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center text-slate-400 text-sm">Hozircha taassurotlar mavjud emas.</div>`;
    return;
  }

  container.innerHTML = reviews.map(r => `
    <div class="glass-card rounded-2xl p-6 border border-slate-200/80 shadow-sm card-hover flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-amber-500 font-bold text-sm tracking-wider">${'★'.repeat(r.rating)}</span>
          <span class="text-[11px] text-slate-400">${new Date(r.createdAt).toLocaleDateString('uz-UZ')}</span>
        </div>
        <p class="text-slate-700 text-sm italic leading-relaxed mb-6">
          "${r.comment}"
        </p>
      </div>

      <div class="pt-4 border-t border-slate-100 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm">
          ${r.student.firstName.charAt(0)}
        </div>
        <div>
          <h5 class="text-xs font-bold text-slate-900">${r.student.lastName} ${r.student.firstName}</h5>
          <p class="text-[11px] text-slate-500">«${r.book.title}» kitobiga taqriz (${r.student.grade})</p>
        </div>
      </div>
    </div>
  `).join('');
}
