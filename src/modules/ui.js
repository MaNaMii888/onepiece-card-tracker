/**
 * UI Renderer & View Components
 */
import { store } from './state.js';

export function fmtMoney(num) {
  return '฿' + Number(num || 0).toLocaleString('th-TH');
}

export function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-medium border flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto ${
    type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' :
    type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' :
    'bg-slate-900/90 border-slate-700 text-slate-200'
  }`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️'}</span> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function updateKpiDisplay() {
  const totalCards = store.cards.length;
  let inStock = 0;
  let sold = 0;
  let totalCost = 0;
  let totalSales = 0;

  store.cards.forEach(c => {
    const isSold = c.status === 'ขายแล้ว' || c.sellPrice > 0;
    if (isSold) sold++; else inStock++;
    totalCost += Number(c.buyPrice || 0);
    totalSales += Number(c.sellPrice || 0);
  });

  const netProfit = totalSales - totalCost;
  const roi = totalCost > 0 ? ((totalSales - totalCost) / totalCost * 100).toFixed(1) + '%' : '0.0%';
  const avgCost = totalCards > 0 ? Math.round(totalCost / totalCards) : 0;

  document.getElementById('kpiTotalCards').textContent = totalCards;
  document.getElementById('kpiInStock').textContent = inStock;
  document.getElementById('kpiSold').textContent = sold;
  document.getElementById('kpiTotalCost').textContent = fmtMoney(totalCost);
  document.getElementById('kpiAvgCost').textContent = fmtMoney(avgCost);
  document.getElementById('kpiTotalSales').textContent = fmtMoney(totalSales);
  document.getElementById('kpiSoldCount').textContent = sold;
  
  const netProfitEl = document.getElementById('kpiNetProfit');
  netProfitEl.textContent = (netProfit >= 0 ? '+' : '') + fmtMoney(netProfit);
  netProfitEl.className = `text-2xl sm:text-3xl font-extrabold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

  const roiEl = document.getElementById('kpiRoi');
  roiEl.textContent = (netProfit >= 0 ? '+' : '') + roi;
  roiEl.className = `font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
}

export function renderCardsList(onOpenSellModal) {
  const filtered = store.cards.filter(c => {
    const isSold = c.status === 'ขายแล้ว' || c.sellPrice > 0;
    if (store.filterStatus === 'stock' && isSold) return false;
    if (store.filterStatus === 'sold' && !isSold) return false;
    if (store.searchQuery) {
      const matchName = (c.cardName || '').toLowerCase().includes(store.searchQuery);
      const matchSet = (c.cardSet || '').toLowerCase().includes(store.searchQuery);
      const matchRarity = (c.rarityCondition || '').toLowerCase().includes(store.searchQuery);
      return matchName || matchSet || matchRarity;
    }
    return true;
  });

  const gridEl = document.getElementById('cardsGrid');
  const tableWrapper = document.getElementById('cardsTableWrapper');
  const emptyEl = document.getElementById('emptyState');

  if (filtered.length === 0) {
    gridEl.classList.add('hidden');
    tableWrapper.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  if (store.viewMode === 'grid') {
    tableWrapper.classList.add('hidden');
    gridEl.classList.remove('hidden');
    gridEl.innerHTML = filtered.map(c => renderCardGridItem(c)).join('');
  } else {
    gridEl.classList.add('hidden');
    tableWrapper.classList.remove('hidden');
    const tbody = document.getElementById('cardsTableBody');
    tbody.innerHTML = filtered.map(c => renderCardTableRow(c)).join('');
  }

  // Attach sell button click events
  document.querySelectorAll('.btn-open-sell').forEach(btn => {
    btn.onclick = () => {
      const rowId = Number(btn.dataset.rowid);
      const name = btn.dataset.cardname;
      const buyPrice = Number(btn.dataset.buyprice);
      onOpenSellModal(rowId, name, buyPrice);
    };
  });
}

function renderCardGridItem(c) {
  const isSold = c.status === 'ขายแล้ว' || c.sellPrice > 0;
  const profit = (Number(c.sellPrice || 0) - Number(c.buyPrice || 0));
  return `
    <div class="bg-[#1C2541] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition shadow-lg group">
      <div>
        <div class="flex items-start justify-between gap-2">
          <span class="px-2 py-0.5 text-[10px] font-bold rounded-full border ${
            isSold 
              ? 'bg-slate-800 text-slate-400 border-slate-700' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }">
            ${isSold ? 'ขายแล้ว' : 'มีในสต็อก'}
          </span>
          <span class="text-[11px] text-slate-400 truncate max-w-[140px] text-right" title="${c.rarityCondition || 'Normal'}">${c.rarityCondition || 'Normal'}</span>
        </div>

        <div class="mt-3 flex gap-3">
          ${c.imageUrl ? `
            <img src="${c.imageUrl}" alt="${c.cardName}" class="w-16 h-22 object-cover rounded-lg border border-slate-700 flex-shrink-0" onerror="this.style.display='none'">
          ` : `
            <div class="w-16 h-22 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center text-xl flex-shrink-0 text-slate-600">
              🃏
            </div>
          `}
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-bold text-white leading-snug truncate" title="${c.cardName}">${c.cardName}</h4>
            <p class="text-[11px] text-slate-400 truncate mt-0.5">${c.cardSet || '-'}</p>
            <div class="mt-2 text-[11px] text-slate-400">
              ซื้อ: <span class="text-slate-300">${c.buyDate || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-slate-800/80">
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-400">ต้นทุน: <strong class="text-amber-400">${fmtMoney(c.buyPrice)}</strong></span>
          ${isSold ? `
            <span class="text-slate-400">ขาย: <strong class="text-blue-400">${fmtMoney(c.sellPrice)}</strong></span>
          ` : `
            <button 
              data-rowid="${c.rowId}" 
              data-cardname="${c.cardName.replace(/"/g, '&quot;')}" 
              data-buyprice="${c.buyPrice}" 
              class="btn-open-sell px-2.5 py-1 text-[11px] rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-medium transition"
            >
              ปิดการขาย
            </button>
          `}
        </div>

        ${isSold ? `
          <div class="mt-2 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[11px]">
            <span class="text-slate-400">กำไรสุทธิ:</span>
            <span class="font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
              ${profit >= 0 ? '+' : ''}${fmtMoney(profit)} (${c.roi || '0%'})
            </span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderCardTableRow(c) {
  const isSold = c.status === 'ขายแล้ว' || c.sellPrice > 0;
  const profit = (Number(c.sellPrice || 0) - Number(c.buyPrice || 0));
  return `
    <tr class="hover:bg-slate-800/40 transition">
      <td class="py-2.5 px-3">
        ${c.imageUrl ? `<img src="${c.imageUrl}" class="w-8 h-11 object-cover rounded border border-slate-700" onerror="this.src=''">` : '🃏'}
      </td>
      <td class="py-2.5 px-4 font-semibold text-white">${c.cardName}</td>
      <td class="py-2.5 px-3 text-slate-400">${c.cardSet || '-'}</td>
      <td class="py-2.5 px-3 text-slate-300">${c.rarityCondition || '-'}</td>
      <td class="py-2.5 px-3 text-center">
        <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${isSold ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
          ${isSold ? 'ขายแล้ว' : 'มีในสต็อก'}
        </span>
      </td>
      <td class="py-2.5 px-3 text-slate-400">${c.buyDate || '-'}</td>
      <td class="py-2.5 px-3 text-right font-medium text-amber-400">${fmtMoney(c.buyPrice)}</td>
      <td class="py-2.5 px-3 text-slate-400">${c.sellDate || '-'}</td>
      <td class="py-2.5 px-3 text-right font-medium text-blue-400">${c.sellPrice ? fmtMoney(c.sellPrice) : '-'}</td>
      <td class="py-2.5 px-3 text-right font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
        ${isSold ? ((profit >= 0 ? '+' : '') + fmtMoney(profit)) : '-'}
      </td>
      <td class="py-2.5 px-3 text-center">
        ${!isSold ? `
          <button 
            data-rowid="${c.rowId}" 
            data-cardname="${c.cardName.replace(/"/g, '&quot;')}" 
            data-buyprice="${c.buyPrice}" 
            class="btn-open-sell px-2 py-1 text-[10px] rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition"
          >
            ขายแล้ว
          </button>
        ` : '<span class="text-slate-600 text-xs">-</span>'}
      </td>
    </tr>
  `;
}
