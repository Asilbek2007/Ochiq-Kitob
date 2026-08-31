// OchiqKitob — Admin Panel Script

let currentActiveTab = 'dashboard';
let cachedBooks = [];
let cachedStudents = [];
let cachedBorrows = [];

// Books Pagination state in Admin
let adminBooksCurrentPage = 1;
const adminBooksPerPage = 20;
let adminBooksFilterQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  setupSidebarNav();
  setupForms();
  setupSearchInputs();
  setupAutocompletePickers();
  
  // Set default due date to 14 days from now
  setDueDatePreset(14);

  // Initial load
  loadDashboardData();
});

// 1. Sidebar navigation
function setupSidebarNav() {
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.currentTarget.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  currentActiveTab = tabName;

  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.className = 'sidebar-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all bg-emerald-600 text-white shadow-md shadow-emerald-600/20';
    } else {
      btn.className = 'sidebar-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-slate-400 hover:bg-slate-800 hover:text-white';
    }
  });

  document.querySelectorAll('.tab-content').forEach(sec => sec.classList.add('hidden'));
  const activeSec = document.getElementById(`tab-${tabName}`);
  if (activeSec) activeSec.classList.remove('hidden');

  const titleMap = {
    dashboard: 'Boshqaruv Paneli',
    circulation: 'Ijara va Qaytarish (Circulation)',
    books: 'Kitoblar Fondi (Kitoblar CRUD)',
    students: 'O\'quvchilar Boshqaruvi (Students CRUD)',
    history: 'Ijaralar Tarixi va Hisoboti',
    telegram: 'Telegram Bot & Avtomatik Hisobot'
  };
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = titleMap[tabName] || 'Admin Panel';

  if (tabName === 'dashboard') loadDashboardData();
  if (tabName === 'circulation') loadCirculationData();
  if (tabName === 'books') loadBooksData();
  if (tabName === 'students') loadStudentsData();
  if (tabName === 'history') loadHistoryData();
  if (tabName === 'telegram') loadTelegramData();

  if (window.lucide) lucide.createIcons();
}

window.refreshCurrentTab = function() {
  switchTab(currentActiveTab);
};

// 2. Dashboard Data Loading
async function loadDashboardData() {
  try {
    const res = await fetch('/api/stats');
    const result = await res.json();

    if (result.success) {
      const { counters } = result.data;
      document.getElementById('dashStudents').textContent = counters.totalStudents.toLocaleString();
      document.getElementById('dashActive').textContent = counters.activeBorrows.toLocaleString();
      document.getElementById('dashFinished').textContent = counters.totalBorrows.toLocaleString();
      document.getElementById('dashAvailable').textContent = counters.totalBooks.toLocaleString();
    }

    const borrowsRes = await fetch('/api/borrows?status=ACTIVE&limit=5');
    const borrowsResult = await borrowsRes.json();
    const tableBody = document.getElementById('dashActiveBorrowsTable');

    if (borrowsResult.success && tableBody) {
      if (borrowsResult.data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-6 text-center text-slate-400 text-xs">Hozirda barcha kitoblar joyida.</td></tr>`;
      } else {
        tableBody.innerHTML = borrowsResult.data.map(b => {
          const isOverdue = new Date(b.dueDate) < new Date();
          return `
            <tr class="hover:bg-slate-50">
              <td class="px-6 py-4 font-semibold text-slate-900 text-xs">
                ${b.book.title}
                <span class="block text-[10px] text-slate-400 font-normal">№ ${b.book.inventoryNo || 'OK'}</span>
              </td>
              <td class="px-6 py-4 text-xs font-medium text-slate-800">
                ${b.student.firstName} ${b.student.lastName}
                <span class="block text-[10px] text-slate-400">${b.student.grade}-sinf</span>
              </td>
              <td class="px-6 py-4 text-xs text-slate-500">
                ${new Date(b.borrowDate).toLocaleDateString('uz-UZ')}
              </td>
              <td class="px-6 py-4 text-xs font-semibold ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'}">
                ${new Date(b.dueDate).toLocaleDateString('uz-UZ')}
                ${isOverdue ? '<span class="ml-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Muddati o\'tgan</span>' : ''}
              </td>
              <td class="px-6 py-4 text-right">
                <button onclick="openReturnModal(${b.id}, '${escapeHtml(b.book.title)}', '${escapeHtml(b.student.firstName + ' ' + b.student.lastName)}')" class="px-3 py-1 bg-emerald-100 hover:bg-emerald-600 hover:text-white text-emerald-800 font-semibold rounded-lg text-xs transition-all">
                  Qabul qilish
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

// 3. Searchable Autocomplete Pickers in Checkout
function setupAutocompletePickers() {
  const stdSearch = document.getElementById('checkoutStudentSearch');
  const stdDropdown = document.getElementById('checkoutStudentDropdown');
  const bkSearch = document.getElementById('checkoutBookSearch');
  const bkDropdown = document.getElementById('checkoutBookDropdown');

  // Student search input listener
  if (stdSearch && stdDropdown) {
    stdSearch.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        stdDropdown.classList.add('hidden');
        return;
      }

      const matches = cachedStudents.filter(s => 
        s.firstName.toLowerCase().includes(q) || 
        s.lastName.toLowerCase().includes(q) || 
        s.grade.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
      );

      if (matches.length === 0) {
        stdDropdown.innerHTML = `<div class="p-3 text-xs text-slate-400 text-center">O'quvchi topilmadi</div>`;
      } else {
        stdDropdown.innerHTML = matches.slice(0, 10).map(s => `
          <div onclick="selectStudentForCheckout(${s.id}, '${escapeHtml(s.firstName + ' ' + s.lastName)}', '${escapeHtml(s.grade)}')" class="p-3 hover:bg-emerald-50 cursor-pointer transition-colors flex items-center justify-between text-xs">
            <div>
              <span class="font-bold text-slate-900 block">${s.firstName} ${s.lastName}</span>
              <span class="text-[11px] text-slate-500">${s.grade}-sinf | ${s.phone || 'tel yo\'q'}</span>
            </div>
            <span class="text-emerald-700 font-semibold text-[11px]">Tanlash →</span>
          </div>
        `).join('');
      }
      stdDropdown.classList.remove('hidden');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!stdSearch.contains(e.target) && !stdDropdown.contains(e.target)) {
        stdDropdown.classList.add('hidden');
      }
    });
  }

  // Book search input listener
  if (bkSearch && bkDropdown) {
    bkSearch.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        bkDropdown.classList.add('hidden');
        return;
      }

      const matches = cachedBooks.filter(b => 
        (b.availableCopies > 0 || b.status === 'AVAILABLE') &&
        (b.title.toLowerCase().includes(q) || 
         b.author.toLowerCase().includes(q) || 
         (b.inventoryNo && b.inventoryNo.toLowerCase().includes(q)))
      );

      if (matches.length === 0) {
        bkDropdown.innerHTML = `<div class="p-3 text-xs text-slate-400 text-center">Bo'sh kitob topilmadi</div>`;
      } else {
        bkDropdown.innerHTML = matches.slice(0, 10).map(b => `
          <div onclick="selectBookForCheckout(${b.id}, '${escapeHtml(b.title)}', '${escapeHtml(b.author)}', '${escapeHtml(b.inventoryNo || 'OK')}', ${b.availableCopies || 1})" class="p-3 hover:bg-emerald-50 cursor-pointer transition-colors flex items-center justify-between text-xs">
            <div>
              <span class="font-bold text-slate-900 block">«${b.title}»</span>
              <span class="text-[11px] text-slate-500">${b.author} [${b.inventoryNo || 'OK'}]</span>
            </div>
            <span class="text-emerald-700 font-bold text-[11px] bg-emerald-100 px-2 py-0.5 rounded-full">🟢 ${b.availableCopies || 1} bo'sh</span>
          </div>
        `).join('');
      }
      bkDropdown.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!bkSearch.contains(e.target) && !bkDropdown.contains(e.target)) {
        bkDropdown.classList.add('hidden');
      }
    });
  }
}

window.selectStudentForCheckout = function(id, name, grade) {
  document.getElementById('checkoutSelectedStudentId').value = id;
  document.getElementById('selectedStudentText').innerHTML = `<i data-lucide="user-check" class="w-4 h-4 text-emerald-600"></i> ${name} (${grade}-sinf)`;
  document.getElementById('checkoutSelectedStudentBadge').classList.remove('hidden');
  document.getElementById('checkoutStudentSearch').value = '';
  document.getElementById('checkoutStudentDropdown').classList.add('hidden');
  if (window.lucide) lucide.createIcons();
};

window.clearSelectedStudent = function() {
  document.getElementById('checkoutSelectedStudentId').value = '';
  document.getElementById('checkoutSelectedStudentBadge').classList.add('hidden');
};

window.selectBookForCheckout = function(id, title, author, inv, available) {
  document.getElementById('checkoutSelectedBookId').value = id;
  document.getElementById('selectedBookText').innerHTML = `<i data-lucide="book-check" class="w-4 h-4 text-emerald-600"></i> «${title}» (${inv}) — 🟢 ${available} ta bo'sh`;
  document.getElementById('checkoutSelectedBookBadge').classList.remove('hidden');
  document.getElementById('checkoutBookSearch').value = '';
  document.getElementById('checkoutBookDropdown').classList.add('hidden');
  if (window.lucide) lucide.createIcons();
};

window.clearSelectedBook = function() {
  document.getElementById('checkoutSelectedBookId').value = '';
  document.getElementById('checkoutSelectedBookBadge').classList.add('hidden');
};

window.setDueDatePreset = function(days) {
  const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const formatted = targetDate.toISOString().split('T')[0];
  const input = document.getElementById('checkoutDueDateInput');
  if (input) input.value = formatted;
};

// Shortcut: "Kitob berish" directly from Students list
window.quickCheckoutForStudent = function(studentId, firstName, lastName, grade) {
  switchTab('circulation');
  selectStudentForCheckout(studentId, `${firstName} ${lastName}`, grade);
  document.getElementById('checkoutBookSearch').focus();
};

// 4. Circulation Data Loading
async function loadCirculationData() {
  try {
    // Cache students & books
    const [stdRes, bkRes, activeRes] = await Promise.all([
      fetch('/api/students'),
      fetch('/api/books'),
      fetch('/api/borrows?status=ACTIVE')
    ]);

    const stdResult = await stdRes.json();
    const bkResult = await bkRes.json();
    const activeResult = await activeRes.json();

    if (stdResult.success) cachedStudents = stdResult.data;
    if (bkResult.success) cachedBooks = bkResult.data;

    const tableBody = document.getElementById('circulationActiveTable');
    const countBadge = document.getElementById('activeCountBadge');

    if (activeResult.success && tableBody) {
      cachedBorrows = activeResult.data;
      if (countBadge) countBadge.textContent = `${cachedBorrows.length} ta faol ijara`;

      if (cachedBorrows.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400 text-sm">Hozirda barcha kitoblar javonda. Faol ijara yo'q.</td></tr>`;
      } else {
        tableBody.innerHTML = cachedBorrows.map(b => {
          const isOverdue = new Date(b.dueDate) < new Date();
          return `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4">
                <span class="font-bold text-slate-900 text-xs block">«${b.book.title}»</span>
                <span class="text-[11px] text-slate-500">${b.book.author} (№ ${b.book.inventoryNo || 'OK'})</span>
              </td>
              <td class="px-6 py-4 text-xs font-semibold text-slate-800">
                ${b.student.firstName} ${b.student.lastName}
              </td>
              <td class="px-6 py-4 text-xs text-slate-600">
                <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">${b.student.grade}</span>
              </td>
              <td class="px-6 py-4 text-xs text-slate-500">
                ${new Date(b.borrowDate).toLocaleDateString('uz-UZ')}
              </td>
              <td class="px-6 py-4 text-xs font-semibold ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'}">
                ${new Date(b.dueDate).toLocaleDateString('uz-UZ')}
                ${isOverdue ? '<span class="block text-[10px] text-red-500 font-normal">Muddat o\'tdi</span>' : ''}
              </td>
              <td class="px-6 py-4 text-right">
                <button onclick="openReturnModal(${b.id}, '${escapeHtml(b.book.title)}', '${escapeHtml(b.student.firstName + ' ' + b.student.lastName)}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5 ml-auto">
                  <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                  <span>Qabul Qilish</span>
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Circulation load error:', err);
  }
}

// 5. Books CRUD with Pagination & Detail Modal
async function loadBooksData(search = '', page = 1) {
  try {
    adminBooksFilterQuery = search;
    adminBooksCurrentPage = page;

    let url = '/api/books';
    if (search) url += `?search=${encodeURIComponent(search)}`;
    
    const res = await fetch(url);
    const result = await res.json();
    const tableBody = document.getElementById('adminBooksTable');
    const paginationContainer = document.getElementById('adminBooksPagination');

    if (result.success && tableBody) {
      cachedBooks = result.data;
      const totalBooks = cachedBooks.length;
      const totalPages = Math.ceil(totalBooks / adminBooksPerPage) || 1;

      if (adminBooksCurrentPage > totalPages) adminBooksCurrentPage = totalPages;

      const startIndex = (adminBooksCurrentPage - 1) * adminBooksPerPage;
      const paginatedBooks = cachedBooks.slice(startIndex, startIndex + adminBooksPerPage);

      if (paginatedBooks.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400">Kitoblar topilmadi.</td></tr>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
      }

      tableBody.innerHTML = paginatedBooks.map(b => {
        const isAvailable = b.availableCopies > 0;
        const total = b.totalCopies || 4;
        const available = b.availableCopies || 0;
        const borrowed = b.borrowedCopies || 0;
        const defaultCover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

        return `
          <tr class="hover:bg-emerald-50/40 cursor-pointer transition-colors" onclick="openBookDetailModal(${b.id})">
            <td class="px-6 py-4 flex items-center gap-3">
              <img src="${b.coverUrl || defaultCover}" alt="${b.title}" class="w-10 h-14 object-cover rounded-lg shadow-sm" onerror="this.src='${defaultCover}'">
              <div>
                <h5 class="font-bold text-slate-900 text-xs hover:text-emerald-600 transition-colors">${b.title}</h5>
                <span class="text-[11px] text-slate-400">${b.pageCount || 0} sahifa | ${b.readCount || 0} marta o'qilgan</span>
              </div>
            </td>
            <td class="px-6 py-4 text-xs font-medium text-slate-700">${b.author}</td>
            <td class="px-6 py-4 text-xs">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">${b.category}</span>
            </td>
            <td class="px-6 py-4 text-xs font-mono font-semibold text-slate-600">${b.inventoryNo || 'OK'}</td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-2 text-xs font-bold">
                <span class="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">🟢 ${available} bo'sh</span>
                <span class="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">🔴 ${borrowed} band</span>
              </div>
            </td>
            <td class="px-6 py-4 text-right space-x-2" onclick="event.stopPropagation()">
              <button onclick="openBookDetailModal(${b.id})" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Batafsil ko'rish">
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
              <button onclick="openEditBookModal(${b.id})" class="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Tahrirlash">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button onclick="deleteBook(${b.id})" class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="O'chirish">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // Render Pagination Bar
      if (paginationContainer) {
        let pagesHtml = '';
        for (let p = 1; p <= totalPages; p++) {
          if (p === adminBooksCurrentPage) {
            pagesHtml += `<button class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold">${p}</button>`;
          } else if (p === 1 || p === totalPages || Math.abs(p - adminBooksCurrentPage) <= 1) {
            pagesHtml += `<button onclick="loadBooksData('${escapeHtml(adminBooksFilterQuery)}', ${p})" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">${p}</button>`;
          } else if (p === adminBooksCurrentPage - 2 || p === adminBooksCurrentPage + 2) {
            pagesHtml += `<span class="px-1 text-slate-400">...</span>`;
          }
        }

        paginationContainer.innerHTML = `
          <div class="text-slate-500">
            Jami <strong>${totalBooks} ta</strong> kitobdan <strong>${startIndex + 1}-${Math.min(startIndex + adminBooksPerPage, totalBooks)}</strong> ko'rsatilmoqda
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="loadBooksData('${escapeHtml(adminBooksFilterQuery)}', ${adminBooksCurrentPage - 1})" ${adminBooksCurrentPage <= 1 ? 'disabled class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"' : 'class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"'}>
              ← Oldingi
            </button>
            ${pagesHtml}
            <button onclick="loadBooksData('${escapeHtml(adminBooksFilterQuery)}', ${adminBooksCurrentPage + 1})" ${adminBooksCurrentPage >= totalPages ? 'disabled class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"' : 'class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"'}>
              Keyingi →
            </button>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Books load error:', err);
  }
}

// Open Book Detail Modal
window.openBookDetailModal = async function(id) {
  const modal = document.getElementById('bookDetailModal');
  const container = document.getElementById('bookDetailModalContent');
  if (!modal || !container) return;

  modal.classList.remove('hidden');
  container.innerHTML = `<div class="py-12 text-center text-slate-400 text-sm">Yuklanmoqda...</div>`;

  try {
    const res = await fetch(`/api/books/${id}`);
    const result = await res.json();

    if (result.success && result.data) {
      const b = result.data;
      const defaultCover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

      const activeBorrows = b.borrows ? b.borrows.filter(br => br.status === 'ACTIVE') : [];

      container.innerHTML = `
        <div class="flex flex-col sm:flex-row gap-6 pb-6 border-b border-slate-100">
          <img src="${b.coverUrl || defaultCover}" alt="${b.title}" class="w-full sm:w-44 h-60 object-cover rounded-2xl shadow-md">
          <div class="flex-1">
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${b.category}</span>
            <h3 class="text-2xl font-bold text-slate-900 font-serif-title mt-2 mb-1">${b.title}</h3>
            <p class="text-sm font-medium text-emerald-700 mb-4">${b.author}</p>

            <div class="grid grid-cols-3 gap-2 mb-4 text-center">
              <div class="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span class="text-[10px] text-slate-400 block">Jami nusxalar</span>
                <span class="text-xs font-bold text-slate-800">${b.totalCopies} ta</span>
              </div>
              <div class="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                <span class="text-[10px] text-emerald-600 block">Mavjud (Bo'sh)</span>
                <span class="text-xs font-bold text-emerald-700">${b.availableCopies} ta</span>
              </div>
              <div class="bg-amber-50 p-2 rounded-xl border border-amber-100">
                <span class="text-[10px] text-amber-600 block">O'qilmoqda</span>
                <span class="text-xs font-bold text-amber-700">${b.borrowedCopies} ta</span>
              </div>
            </div>

            <p class="text-xs text-slate-600 leading-relaxed mb-4">${b.description || 'Tavsif yo\'q'}</p>

            <div class="flex items-center gap-3">
              <button onclick="closeBookDetailModal(); openEditBookModal(${b.id});" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                <span>Tahrirlash</span>
              </button>
              <button onclick="closeBookDetailModal(); deleteBook(${b.id});" class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                <span>O'chirish</span>
              </button>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <h4 class="font-bold text-sm text-slate-900 mb-3">Hozirda kitobni o'qiyotgan kitobxonlar (${activeBorrows.length})</h4>
          ${activeBorrows.length === 0 ? '<p class="text-xs text-slate-400">Ushbu kitob bo\'yicha ayni paytda hech kimda faol ijara yo\'q.</p>' : `
            <div class="space-y-2">
              ${activeBorrows.map(br => `
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span class="font-bold text-slate-900">${br.student.firstName} ${br.student.lastName}</span>
                    <span class="text-slate-500">(${br.student.grade}-sinf, tel: ${br.student.phone || 'yo\'q'})</span>
                  </div>
                  <div class="text-right">
                    <span class="text-slate-400 block text-[10px]">Qaytarish muddati:</span>
                    <span class="font-bold text-slate-700">${new Date(br.dueDate).toLocaleDateString('uz-UZ')}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

      if (window.lucide) lucide.createIcons();
    }
  } catch (err) {
    container.innerHTML = `<div class="text-red-500 text-sm">Ma'lumot yuklanmadi.</div>`;
  }
};

window.closeBookDetailModal = function() {
  document.getElementById('bookDetailModal').classList.add('hidden');
};

// 6. Students CRUD Logic
async function loadStudentsData(search = '') {
  try {
    let url = '/api/students';
    if (search) url += `?search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    const result = await res.json();
    const tableBody = document.getElementById('adminStudentsTable');

    if (result.success && tableBody) {
      cachedStudents = result.data;
      if (cachedStudents.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400">O'quvchilar topilmadi.</td></tr>`;
        return;
      }

      tableBody.innerHTML = cachedStudents.map(s => {
        const readCount = s.readCount || (s.borrows ? s.borrows.filter(b => b.status === 'RETURNED').length : 0);
        const activeBorrow = s.borrows ? s.borrows.find(b => b.status === 'ACTIVE') : null;

        return `
          <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4">
              <span class="font-bold text-slate-900 text-xs block">${s.firstName} ${s.lastName}</span>
              ${activeBorrow ? `<span class="text-[10px] text-amber-600 font-semibold">«${activeBorrow.book.title}» kitobini o'qimoqda</span>` : ''}
            </td>
            <td class="px-6 py-4 text-xs font-semibold text-emerald-700">
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">${s.grade}</span>
            </td>
            <td class="px-6 py-4 text-xs text-slate-600 font-mono">${s.phone || '—'}</td>
            <td class="px-6 py-4 text-xs font-bold text-slate-800">
              ${readCount} ta kitob
            </td>
            <td class="px-6 py-4 text-right space-x-2">
              <button onclick="quickCheckoutForStudent(${s.id}, '${escapeHtml(s.firstName)}', '${escapeHtml(s.lastName)}', '${escapeHtml(s.grade)}')" class="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-600 hover:text-white text-emerald-800 font-bold rounded-lg text-xs transition-all" title="Ushbu o'quvchiga kitob berish">
                + Kitob berish
              </button>
              <button onclick="openEditStudentModal(${s.id})" class="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Tahrirlash">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button onclick="deleteStudent(${s.id})" class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="O'chirish">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Students load error:', err);
  }
}

// 7. History Logic
async function loadHistoryData() {
  try {
    const filterSelect = document.getElementById('historyFilterSelect');
    const status = filterSelect ? filterSelect.value : 'ALL';

    let url = '/api/borrows';
    if (status !== 'ALL') url += `?status=${status}`;

    const res = await fetch(url);
    const result = await res.json();
    const tableBody = document.getElementById('adminHistoryTable');

    if (result.success && tableBody) {
      if (result.data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400">Tarixiy yozuvlar topilmadi.</td></tr>`;
        return;
      }

      tableBody.innerHTML = result.data.map(b => {
        const isReturned = b.status === 'RETURNED';
        return `
          <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-semibold text-slate-900 text-xs">
              «${b.book.title}»
              <span class="block text-[10px] text-slate-400 font-normal">№ ${b.book.inventoryNo || 'OK'}</span>
            </td>
            <td class="px-6 py-4 text-xs text-slate-800">
              ${b.student.firstName} ${b.student.lastName}
              <span class="text-[10px] text-slate-400 block">${b.student.grade}</span>
            </td>
            <td class="px-6 py-4 text-xs text-slate-500">${new Date(b.borrowDate).toLocaleDateString('uz-UZ')}</td>
            <td class="px-6 py-4 text-xs text-slate-500">
              ${b.returnDate ? new Date(b.returnDate).toLocaleDateString('uz-UZ') : '—'}
            </td>
            <td class="px-6 py-4 text-xs font-bold">
              <span class="${isReturned ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'} px-2.5 py-1 rounded-full text-[11px]">
                ${isReturned ? 'Topshirildi' : 'O\'qilmoqda'}
              </span>
            </td>
            <td class="px-6 py-4 text-xs">
              ${b.review ? `
                <span class="text-amber-500 font-bold">${'★'.repeat(b.review.rating)}</span>
                <p class="text-[11px] text-slate-600 italic truncate max-w-xs" title="${escapeHtml(b.review.comment)}">"${escapeHtml(b.review.comment)}"</p>
              ` : '<span class="text-slate-400 text-[11px]">—</span>'}
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('History load error:', err);
  }
}

// 8. Telegram Preview & Send
async function loadTelegramData() {
  const previewBox = document.getElementById('telegramPreviewText');
  if (!previewBox) return;

  try {
    previewBox.textContent = 'Yuklanmoqda...';
    const res = await fetch('/api/telegram/test-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sendNow: false })
    });
    const result = await res.json();

    if (result.success && result.data) {
      previewBox.textContent = result.data.text;
    }
  } catch (err) {
    previewBox.textContent = 'Hisobotni yuklashda xatolik: ' + err.message;
  }
}

window.sendTelegramTestReport = async function() {
  const btn = document.getElementById('sendTelegramBtn');
  const statusMsg = document.getElementById('telegramStatusMsg');
  if (!btn || !statusMsg) return;

  try {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Yuborilmoqda...</span>`;
    if (window.lucide) lucide.createIcons();

    const res = await fetch('/api/telegram/test-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sendNow: true })
    });
    const result = await res.json();

    if (result.success) {
      statusMsg.className = 'text-xs font-semibold text-emerald-700 bg-emerald-100 p-2.5 rounded-xl border border-emerald-200';
      statusMsg.textContent = result.message || 'Hisobot muvaffaqiyatli jo\'natildi!';
    } else {
      statusMsg.className = 'text-xs font-semibold text-red-700 bg-red-100 p-2.5 rounded-xl border border-red-200';
      statusMsg.textContent = 'Xatolik: ' + (result.error || 'Yuborib bo\'lmadi');
    }
  } catch (err) {
    statusMsg.className = 'text-xs font-semibold text-red-700 bg-red-100 p-2.5 rounded-xl';
    statusMsg.textContent = 'Aloqa xatosi: ' + err.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="send" class="w-4 h-4"></i><span>Telegram Kanalga Yuborish</span>`;
    if (window.lucide) lucide.createIcons();
  }
};

// 9. Forms Setup
function setupForms() {
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const studentId = document.getElementById('checkoutSelectedStudentId').value;
      const bookId = document.getElementById('checkoutSelectedBookId').value;
      const dueDateVal = document.getElementById('checkoutDueDateInput').value;

      if (!studentId || !bookId) {
        alert('Iltimos, o\'quvchi va kitobni qidirib tanlang!');
        return;
      }

      // Calculate days difference
      const dueDate = new Date(dueDateVal);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const durationDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      try {
        const res = await fetch('/api/borrows/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, bookId, durationDays })
        });
        const result = await res.json();

        if (result.success) {
          alert('✅ ' + result.message);
          checkoutForm.reset();
          clearSelectedStudent();
          clearSelectedBook();
          setDueDatePreset(14);
          loadCirculationData();
        } else {
          alert('❌ Xatolik: ' + (result.error || 'Kitobni berib bo\'lmadi'));
        }
      } catch (err) {
        alert('Tarmoq xatosi: ' + err.message);
      }
    });
  }

  // Return Form
  const returnForm = document.getElementById('returnForm');
  if (returnForm) {
    returnForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const borrowId = document.getElementById('returnBorrowId').value;
      const isFinished = document.getElementById('returnIsFinished').checked;
      const rating = document.getElementById('returnRating').value;
      const comment = document.getElementById('returnComment').value;

      try {
        const res = await fetch('/api/borrows/return', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ borrowId, isFinished, rating, comment })
        });
        const result = await res.json();

        if (result.success) {
          alert('✅ ' + result.message);
          closeReturnModal();
          if (currentActiveTab === 'circulation') loadCirculationData();
          if (currentActiveTab === 'dashboard') loadDashboardData();
          if (currentActiveTab === 'history') loadHistoryData();
        } else {
          alert('❌ Xatolik: ' + result.error);
        }
      } catch (err) {
        alert('Tarmoq xatosi: ' + err.message);
      }
    });
  }

  // Book Modal Form
  const bookModalForm = document.getElementById('bookModalForm');
  if (bookModalForm) {
    bookModalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('bookFormId').value;
      const title = document.getElementById('bookFormTitle').value;
      const author = document.getElementById('bookFormAuthor').value;
      const category = document.getElementById('bookFormCategory').value;
      const inventoryNo = document.getElementById('bookFormInventoryNo').value;
      const pageCount = document.getElementById('bookFormPageCount').value;
      const totalCopies = document.getElementById('bookFormTotalCopies').value;
      const coverUrl = document.getElementById('bookFormCoverUrl').value;
      const description = document.getElementById('bookFormDescription').value;

      const payload = { title, author, category, inventoryNo, pageCount, totalCopies, coverUrl, description };

      try {
        const url = id ? `/api/books/${id}` : '/api/books';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
          alert('✅ ' + (result.message || 'Saqlandi!'));
          closeBookFormModal();
          loadBooksData(adminBooksFilterQuery, adminBooksCurrentPage);
        } else {
          alert('❌ Xatolik: ' + result.error);
        }
      } catch (err) {
        alert('Xatolik: ' + err.message);
      }
    });
  }

  // Student Modal Form
  const studentModalForm = document.getElementById('studentModalForm');
  if (studentModalForm) {
    studentModalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('studentFormId').value;
      const firstName = document.getElementById('studentFormFirstName').value;
      const lastName = document.getElementById('studentFormLastName').value;
      const grade = document.getElementById('studentFormGrade').value;
      const phone = document.getElementById('studentFormPhone').value;

      const payload = { firstName, lastName, grade, phone };

      try {
        const url = id ? `/api/students/${id}` : '/api/students';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
          alert('✅ ' + (result.message || 'Saqlandi!'));
          closeStudentFormModal();
          loadStudentsData();
        } else {
          alert('❌ Xatolik: ' + result.error);
        }
      } catch (err) {
        alert('Xatolik: ' + err.message);
      }
    });
  }

  const historyFilter = document.getElementById('historyFilterSelect');
  if (historyFilter) {
    historyFilter.addEventListener('change', () => loadHistoryData());
  }
}

function setupSearchInputs() {
  const bookSearch = document.getElementById('adminBookSearch');
  if (bookSearch) {
    bookSearch.addEventListener('input', (e) => loadBooksData(e.target.value, 1));
  }

  const studentSearch = document.getElementById('adminStudentSearch');
  if (studentSearch) {
    studentSearch.addEventListener('input', (e) => loadStudentsData(e.target.value));
  }
}

// Modal Helpers
window.openReturnModal = function(borrowId, bookTitle, studentName) {
  const modal = document.getElementById('returnModal');
  const idInput = document.getElementById('returnBorrowId');
  const subtitle = document.getElementById('returnModalSubtitle');
  const form = document.getElementById('returnForm');

  if (modal && idInput && subtitle) {
    idInput.value = borrowId;
    subtitle.innerHTML = `Kitob: <strong>«${bookTitle}»</strong> | O'quvchi: <strong>${studentName}</strong>`;
    form.reset();
    document.getElementById('returnIsFinished').checked = true;
    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }
};

window.closeReturnModal = function() {
  document.getElementById('returnModal').classList.add('hidden');
};

window.openAddBookModal = function() {
  document.getElementById('bookFormId').value = '';
  document.getElementById('bookFormModalTitle').textContent = 'Yangi Kitob Qo\'shish';
  document.getElementById('bookModalForm').reset();
  document.getElementById('bookFormTotalCopies').value = '4';
  document.getElementById('bookFormModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
};

window.openEditBookModal = function(id) {
  const book = cachedBooks.find(b => b.id === id);
  if (!book) return;

  document.getElementById('bookFormId').value = book.id;
  document.getElementById('bookFormModalTitle').textContent = 'Kitobni Tahrirlash';
  document.getElementById('bookFormTitle').value = book.title || '';
  document.getElementById('bookFormAuthor').value = book.author || '';
  document.getElementById('bookFormCategory').value = book.category || '';
  document.getElementById('bookFormInventoryNo').value = book.inventoryNo || '';
  document.getElementById('bookFormPageCount').value = book.pageCount || 0;
  document.getElementById('bookFormTotalCopies').value = book.totalCopies || 4;
  document.getElementById('bookFormCoverUrl').value = book.coverUrl || '';
  document.getElementById('bookFormDescription').value = book.description || '';

  document.getElementById('bookFormModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
};

window.closeBookFormModal = function() {
  document.getElementById('bookFormModal').classList.add('hidden');
};

window.deleteBook = async function(id) {
  if (!confirm('Haqiqatan ham bu kitobni o\'chirmoqchimisiz?')) return;

  try {
    const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      alert('✅ Kitob o\'chirildi');
      loadBooksData(adminBooksFilterQuery, adminBooksCurrentPage);
    } else {
      alert('❌ ' + result.error);
    }
  } catch (err) {
    alert('Xatolik: ' + err.message);
  }
};

window.openAddStudentModal = function() {
  document.getElementById('studentFormId').value = '';
  document.getElementById('studentFormModalTitle').textContent = 'Yangi O\'quvchi Qo\'shish';
  document.getElementById('studentModalForm').reset();
  document.getElementById('studentFormModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
};

window.openEditStudentModal = function(id) {
  const student = cachedStudents.find(s => s.id === id);
  if (!student) return;

  document.getElementById('studentFormId').value = student.id;
  document.getElementById('studentFormModalTitle').textContent = 'O\'quvchini Tahrirlash';
  document.getElementById('studentFormFirstName').value = student.firstName || '';
  document.getElementById('studentFormLastName').value = student.lastName || '';
  document.getElementById('studentFormGrade').value = student.grade || '';
  document.getElementById('studentFormPhone').value = student.phone || '';

  document.getElementById('studentFormModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
};

window.closeStudentFormModal = function() {
  document.getElementById('studentFormModal').classList.add('hidden');
};

window.deleteStudent = async function(id) {
  if (!confirm('Haqiqatan ham bu o\'quvchini o\'chirmoqchimisiz?')) return;

  try {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      alert('✅ O\'quvchi o\'chirildi');
      loadStudentsData();
    } else {
      alert('❌ ' + result.error);
    }
  } catch (err) {
    alert('Xatolik: ' + err.message);
  }
};

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
