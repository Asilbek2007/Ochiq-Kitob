// OchiqKitob — Reyting Sahifasi Skripti

let cachedTopBooks = [];

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  setupTabs();
  loadTopBooks();
  loadTopReaders();
  loadWeeklyTop();
  loadReviews();

  const searchInput = document.getElementById('topBooksSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterTopBooks(e.target.value);
    });
  }
});

function setupTabs() {
  document.querySelectorAll('.reyting-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.currentTarget.dataset.tab;

      // Update button active state
      document.querySelectorAll('.reyting-tab-btn').forEach(b => {
        b.className = 'reyting-tab-btn flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5';
      });

      const current = e.currentTarget;
      current.className = 'reyting-tab-btn flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold bg-white text-slate-900 shadow-sm transition-all flex items-center justify-center gap-1.5';

      // Hide all contents & show active
      document.querySelectorAll('.reyting-content').forEach(c => c.classList.add('hidden'));
      const activeContent = document.getElementById(`tab-${tabName}`);
      if (activeContent) activeContent.classList.remove('hidden');

      if (window.lucide) lucide.createIcons();
    });
  });
}

// 1. Load Top 100 Books
async function loadTopBooks() {
  try {
    const res = await fetch('/api/stats/top-books');
    const result = await res.json();
    if (result.success) {
      cachedTopBooks = result.data;
      renderTopBooksTable(cachedTopBooks);
    }
  } catch (err) {
    console.error('Top books load error:', err);
  }
}

function filterTopBooks(query) {
  if (!query || query.trim() === '') {
    renderTopBooksTable(cachedTopBooks);
    return;
  }
  const q = query.toLowerCase();
  const filtered = cachedTopBooks.filter(b => 
    b.title.toLowerCase().includes(q) || 
    b.author.toLowerCase().includes(q) ||
    b.category.toLowerCase().includes(q)
  );
  renderTopBooksTable(filtered);
}

function renderTopBooksTable(books) {
  const tbody = document.getElementById('topBooksTableBody');
  if (!tbody) return;

  if (books.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400">Kitoblar topilmadi.</td></tr>`;
    return;
  }

  tbody.innerHTML = books.map((b, idx) => {
    let rankBadge = `<span class="font-bold text-slate-500 text-xs">${idx + 1}</span>`;
    if (idx === 0) rankBadge = `<span class="text-xl">🥇</span>`;
    else if (idx === 1) rankBadge = `<span class="text-xl">🥈</span>`;
    else if (idx === 2) rankBadge = `<span class="text-xl">🥉</span>`;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-6 py-4 text-center">${rankBadge}</td>
        <td class="px-6 py-4">
          <span class="font-bold text-slate-900 text-sm block">«${b.title}»</span>
          <span class="text-[11px] text-slate-400">№ ${b.inventoryNo || 'OK'}</span>
        </td>
        <td class="px-6 py-4 text-xs font-medium text-slate-700">${b.author}</td>
        <td class="px-6 py-4 text-xs">
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium">${b.category}</span>
        </td>
        <td class="px-6 py-4 text-right">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-emerald-400 font-extrabold text-xs font-mono shadow-sm">
            <i data-lucide="book-open" class="w-3.5 h-3.5 text-emerald-400"></i>
            ${b.readCount} marta
          </span>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// 2. Load Top 30 Readers
async function loadTopReaders() {
  try {
    const res = await fetch('/api/stats/top-readers');
    const result = await res.json();
    if (result.success && result.data) {
      const readers = result.data;

      // Podium Top 3
      const podium = document.getElementById('top3PodiumContainer');
      if (podium && readers.length >= 3) {
        const top3 = readers.slice(0, 3);
        const medals = [
          { medal: '🥇', rank: '1-o\'rin', border: 'border-amber-400 bg-amber-50/50' },
          { medal: '🥈', rank: '2-o\'rin', border: 'border-slate-300 bg-slate-50' },
          { medal: '🥉', rank: '3-o\'rin', border: 'border-amber-700/30 bg-amber-50/30' }
        ];

        podium.innerHTML = top3.map((r, i) => `
          <div class="glass-card rounded-2xl p-6 border ${medals[i].border} shadow-sm text-center card-hover">
            <div class="text-4xl mb-2">${medals[i].medal}</div>
            <span class="text-xs font-bold text-amber-700 uppercase">${medals[i].rank}</span>
            <h4 class="text-xl font-bold text-slate-900 mt-1">${r.lastName} ${r.firstName}</h4>
            <span class="text-xs text-slate-500 block mt-0.5">${r.grade}-sinf o'quvchisi</span>
            <div class="mt-4 pt-3 border-t border-slate-200/60">
              <span class="text-3xl font-extrabold text-emerald-600">${r.readCount}</span>
              <span class="text-xs text-slate-600 block">ta kitob o'qildi</span>
            </div>
          </div>
        `).join('');
      }

      // Full Table
      const tbody = document.getElementById('topReadersTableBody');
      if (tbody) {
        tbody.innerHTML = readers.map((r, idx) => {
          let rankBadge = `<span class="font-bold text-slate-500 text-xs">${idx + 1}</span>`;
          if (idx === 0) rankBadge = `<span class="text-lg">🥇</span>`;
          else if (idx === 1) rankBadge = `<span class="text-lg">🥈</span>`;
          else if (idx === 2) rankBadge = `<span class="text-lg">🥉</span>`;

          return `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 text-center">${rankBadge}</td>
              <td class="px-6 py-4 font-bold text-slate-900 text-sm">
                ${r.lastName} ${r.firstName}
              </td>
              <td class="px-6 py-4 text-xs font-semibold text-emerald-700">
                <span class="px-2.5 py-0.5 rounded-full bg-slate-100">${r.grade}</span>
              </td>
              <td class="px-6 py-4 text-right">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs">
                  ${r.readCount} ta kitob
                </span>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Top readers load error:', err);
  }
}

// 3. Load Weekly Top
async function loadWeeklyTop() {
  try {
    const res = await fetch('/api/stats/weekly-top');
    const result = await res.json();
    const tbody = document.getElementById('weeklyTopTableBody');
    if (result.success && tbody) {
      if (result.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400">Ma'lumotlar yuklanmoqda...</td></tr>`;
        return;
      }

      tbody.innerHTML = result.data.map((b, idx) => `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-6 py-4 text-center font-bold text-xs text-slate-400">${idx + 1}</td>
          <td class="px-6 py-4 font-bold text-slate-900 text-sm">«${b.title}»</td>
          <td class="px-6 py-4 text-xs text-slate-600">${b.author}</td>
          <td class="px-6 py-4 text-xs">
            <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">${b.category}</span>
          </td>
          <td class="px-6 py-4 text-right">
            <span class="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs">
              ${b.weeklyReadCount} marta
            </span>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Weekly top error:', err);
  }
}

// 4. Load Reviews
async function loadReviews() {
  try {
    const res = await fetch('/api/stats');
    const result = await res.json();
    const grid = document.getElementById('allReviewsGrid');
    if (result.success && grid && result.data.featuredReviews) {
      grid.innerHTML = result.data.featuredReviews.map(r => `
        <div class="glass-card rounded-2xl p-6 border border-slate-200/80 shadow-sm card-hover flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-amber-500 font-bold text-sm">${'★'.repeat(r.rating)}</span>
              <span class="text-[11px] text-slate-400">${new Date(r.createdAt).toLocaleDateString('uz-UZ')}</span>
            </div>
            <p class="text-slate-700 text-sm italic leading-relaxed mb-6">
              "${r.comment}"
            </p>
          </div>
          <div class="pt-4 border-t border-slate-100 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
              ${r.student.firstName.charAt(0)}
            </div>
            <div>
              <h5 class="text-xs font-bold text-slate-900">${r.student.lastName} ${r.student.firstName}</h5>
              <p class="text-[11px] text-slate-500">«${r.book.title}» kitobiga (${r.student.grade})</p>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Reviews load error:', err);
  }
}
