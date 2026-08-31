// OchiqKitob — Kitoblar Katalogi Skripti (Pagination bilan)

let currentCategory = 'ALL';
let currentStatus = 'ALL';
let searchQuery = '';

let currentPage = 1;
const booksPerPage = 24;
let allFetchedBooks = [];

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  loadCategories();
  loadBooks();
  setupListeners();
});

function setupListeners() {
  const searchInput = document.getElementById('catalogSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      loadBooks();
    }, 250));
  }

  document.querySelectorAll('.catalog-status-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.catalog-status-btn').forEach(b => {
        b.className = 'catalog-status-btn px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all whitespace-nowrap';
      });

      const current = e.currentTarget;
      current.className = 'catalog-status-btn px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 text-white shadow-sm transition-all whitespace-nowrap';

      currentStatus = current.dataset.status;
      currentPage = 1;
      loadBooks();
    });
  });

  const closeModalBtn = document.getElementById('closeModalBtn');
  const bookModal = document.getElementById('bookModal');
  if (closeModalBtn && bookModal) {
    closeModalBtn.addEventListener('click', () => bookModal.classList.add('hidden'));
    bookModal.addEventListener('click', (e) => {
      if (e.target === bookModal) bookModal.classList.add('hidden');
    });
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

async function loadCategories() {
  try {
    const res = await fetch('/api/books/categories');
    const result = await res.json();
    const container = document.getElementById('catalogCategoriesContainer');

    if (result.success && container) {
      container.innerHTML = `
        <button data-cat="ALL" class="cat-pill px-3.5 py-1.5 rounded-full font-bold bg-emerald-600 text-white shadow-sm whitespace-nowrap">
          Barcha Janrlar
        </button>
      `;

      result.data.forEach(cat => {
        const btn = document.createElement('button');
        btn.dataset.cat = cat;
        btn.className = 'cat-pill px-3.5 py-1.5 rounded-full font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap transition-all';
        btn.textContent = cat;
        container.appendChild(btn);
      });

      container.querySelectorAll('.cat-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
          container.querySelectorAll('.cat-pill').forEach(b => {
            b.className = 'cat-pill px-3.5 py-1.5 rounded-full font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap transition-all';
          });
          e.currentTarget.className = 'cat-pill px-3.5 py-1.5 rounded-full font-bold bg-emerald-600 text-white shadow-sm whitespace-nowrap';
          currentCategory = e.currentTarget.dataset.cat;
          currentPage = 1;
          loadBooks();
        });
      });
    }
  } catch (err) {
    console.error('Categories error:', err);
  }
}

async function loadBooks() {
  const grid = document.getElementById('catalogBooksGrid');
  const paginationContainer = document.getElementById('catalogPaginationContainer');
  if (!grid) return;

  try {
    let url = '/api/books?';
    if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
    if (currentCategory !== 'ALL') url += `category=${encodeURIComponent(currentCategory)}&`;
    if (currentStatus !== 'ALL') url += `status=${encodeURIComponent(currentStatus)}&`;

    const res = await fetch(url);
    const result = await res.json();

    if (result.success) {
      allFetchedBooks = result.data;
      const totalBooks = allFetchedBooks.length;
      const totalPages = Math.ceil(totalBooks / booksPerPage) || 1;

      if (currentPage > totalPages) currentPage = totalPages;

      if (totalBooks === 0) {
        grid.innerHTML = `<div class="col-span-full py-16 text-center text-slate-400">Kitoblar topilmadi. Qidiruv so'zini o'zgartiring.</div>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
      }

      const startIndex = (currentPage - 1) * booksPerPage;
      const paginatedBooks = allFetchedBooks.slice(startIndex, startIndex + booksPerPage);

      renderBooksGrid(paginatedBooks);
      renderPagination(totalBooks, totalPages, startIndex);
    }
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-red-500">Xatolik yuz berdi.</div>`;
  }
}

function renderBooksGrid(books) {
  const grid = document.getElementById('catalogBooksGrid');
  if (!grid) return;

  const defaultCover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

  grid.innerHTML = books.map(b => {
    const isAvailable = b.availableCopies > 0;
    const total = b.totalCopies || 4;
    const available = b.availableCopies || 0;
    const borrowed = b.borrowedCopies || 0;

    return `
      <div class="glass-card rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm card-hover flex flex-col justify-between">
        <div>
          <div class="relative h-56 bg-slate-100 overflow-hidden group">
            <img src="${b.coverUrl || defaultCover}" alt="${b.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onerror="this.src='${defaultCover}'">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
            
            <div class="absolute top-3 left-3">
              <span class="bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                ${b.inventoryNo || 'OK'}
              </span>
            </div>

            <div class="absolute top-3 right-3">
              <span class="${isAvailable ? 'badge-available' : 'badge-borrowed'} px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
                ${isAvailable ? "BO'SH" : "BAND"}
              </span>
            </div>

            <div class="absolute bottom-3 left-3 right-3 text-white">
              <span class="text-[11px] font-medium uppercase tracking-wider text-emerald-300">${b.category}</span>
            </div>
          </div>

          <div class="p-5">
            <h3 class="font-bold text-base text-slate-900 line-clamp-1 mb-1" title="${b.title}">${b.title}</h3>
            <p class="text-xs text-slate-600 font-medium flex items-center gap-1 mb-3">
              <i data-lucide="feather" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>${b.author}</span>
            </p>

            <!-- Copies Status Box -->
            <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs mb-3 flex items-center justify-between">
              <span class="text-slate-500">Jami: <strong>${total} ta</strong></span>
              <div class="flex items-center gap-2">
                <span class="text-emerald-700 font-bold">🟢 ${available} bo'sh</span>
                <span class="text-amber-700 font-bold">🔴 ${borrowed} band</span>
              </div>
            </div>

            <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              ${b.description || 'Tavsif mavjud emas.'}
            </p>
          </div>
        </div>

        <div class="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
          <span class="text-xs text-slate-400 font-mono">${b.readCount || 0} marta o'qilgan</span>
          <button onclick="openBookModal(${b.id})" class="px-3.5 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-medium rounded-xl text-xs transition-all flex items-center gap-1">
            <span>Batafsil</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function renderPagination(totalBooks, totalPages, startIndex) {
  const container = document.getElementById('catalogPaginationContainer');
  if (!container) return;

  let pagesHtml = '';
  for (let p = 1; p <= totalPages; p++) {
    if (p === currentPage) {
      pagesHtml += `<button class="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold shadow-sm">${p}</button>`;
    } else if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
      pagesHtml += `<button onclick="goToPage(${p})" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors">${p}</button>`;
    } else if (p === currentPage - 2 || p === currentPage + 2) {
      pagesHtml += `<span class="px-1 text-slate-400">...</span>`;
    }
  }

  container.innerHTML = `
    <div class="text-slate-500 text-xs">
      Jami <strong>${totalBooks} ta</strong> kitobdan <strong>${startIndex + 1}-${Math.min(startIndex + booksPerPage, totalBooks)}</strong> ko'rsatilmoqda (Sahifa ${currentPage}/${totalPages})
    </div>
    <div class="flex items-center gap-1.5">
      <button onclick="goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled class="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed"' : 'class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"'}>
        ← Oldingi
      </button>
      ${pagesHtml}
      <button onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled class="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed"' : 'class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"'}>
        Keyingi →
      </button>
    </div>
  `;
}

window.goToPage = function(page) {
  currentPage = page;
  const startIndex = (currentPage - 1) * booksPerPage;
  const paginatedBooks = allFetchedBooks.slice(startIndex, startIndex + booksPerPage);
  const totalPages = Math.ceil(allFetchedBooks.length / booksPerPage) || 1;

  renderBooksGrid(paginatedBooks);
  renderPagination(allFetchedBooks.length, totalPages, startIndex);

  const topEl = document.getElementById('catalogBooksGrid');
  if (topEl) topEl.scrollIntoView({ behavior: 'smooth' });
};

window.openBookModal = async function(id) {
  const modal = document.getElementById('bookModal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;

  modal.classList.remove('hidden');
  content.innerHTML = `<div class="py-12 text-center text-slate-400 text-sm">Yuklanmoqda...</div>`;

  try {
    const res = await fetch(`/api/books/${id}`);
    const result = await res.json();

    if (result.success && result.data) {
      const b = result.data;
      const defaultCover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

      content.innerHTML = `
        <div class="flex flex-col sm:flex-row gap-6">
          <img src="${b.coverUrl || defaultCover}" alt="${b.title}" class="w-full sm:w-44 h-60 object-cover rounded-2xl shadow-md">
          <div class="flex-1">
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${b.category}</span>
            <h3 class="text-2xl font-bold text-slate-900 font-serif-title mt-2 mb-1">${b.title}</h3>
            <p class="text-sm font-medium text-emerald-700 mb-4">${b.author}</p>

            <div class="grid grid-cols-3 gap-2 mb-4 text-center">
              <div class="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span class="text-[10px] text-slate-400 block">Jami nusxa</span>
                <span class="text-xs font-bold text-slate-800">${b.totalCopies} ta</span>
              </div>
              <div class="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                <span class="text-[10px] text-emerald-600 block">Bo'sh</span>
                <span class="text-xs font-bold text-emerald-700">${b.availableCopies} ta</span>
              </div>
              <div class="bg-amber-50 p-2 rounded-xl border border-amber-100">
                <span class="text-[10px] text-amber-600 block">O'qilmoqda</span>
                <span class="text-xs font-bold text-amber-700">${b.borrowedCopies} ta</span>
              </div>
            </div>

            <p class="text-xs text-slate-600 leading-relaxed">${b.description || 'Tavsif yo\'q'}</p>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  } catch (err) {
    content.innerHTML = `<div class="text-red-500 text-sm">Ma'lumot yuklanmadi.</div>`;
  }
};
