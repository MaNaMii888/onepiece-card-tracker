/**
 * UI Renderer & View Components
 */
import { store } from './state.js';

export function fmtMoney(amountNumber) {
  return '฿' + Number(amountNumber || 0).toLocaleString('th-TH');
}

export function formatDisplayDate(dateInput) {
  if (!dateInput) return '-';
  try {
    const parsedDate = new Date(dateInput);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  } catch (error) {}
  return String(dateInput).split('T')[0];
}

export function showToast(messageText, toastType = 'info') {
  const containerElement = document.getElementById('toastContainer');
  if (!containerElement) return;

  const toastCard = document.createElement('div');
  const typeClasses = toastType === 'success' 
    ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
    : toastType === 'error' 
      ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' 
      : 'bg-slate-900/90 border-slate-700 text-slate-200';

  toastCard.className = `px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-medium border flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto ${typeClasses}`;
  const iconSymbol = toastType === 'success' ? '✅' : toastType === 'error' ? '⚠️' : 'ℹ️';
  toastCard.innerHTML = `<span>${iconSymbol}</span> <span>${messageText}</span>`;
  containerElement.appendChild(toastCard);

  setTimeout(() => toastCard.classList.remove('translate-y-2', 'opacity-0'), 10);
  setTimeout(() => {
    toastCard.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toastCard.remove(), 300);
  }, 3500);
}

export function updateKpiDisplay() {
  const totalCount = store.cards.length;
  let inStockCount = 0;
  let soldCount = 0;
  let totalCostSum = 0;
  let totalSalesSum = 0;

  store.cards.forEach(singleCard => {
    const isSold = singleCard.status === 'ขายแล้ว' || singleCard.sellPrice > 0;
    if (isSold) soldCount++; else inStockCount++;
    totalCostSum += Number(singleCard.buyPrice || 0);
    totalSalesSum += Number(singleCard.sellPrice || 0);
  });

  const netProfitAmount = totalSalesSum - totalCostSum;
  const netRoiRatio = totalCostSum > 0 ? ((totalSalesSum - totalCostSum) / totalCostSum * 100).toFixed(1) + '%' : '0.0%';
  const averageCardCost = totalCount > 0 ? Math.round(totalCostSum / totalCount) : 0;

  document.getElementById('kpiTotalCards').textContent = totalCount;
  document.getElementById('kpiInStock').textContent = inStockCount;
  document.getElementById('kpiSold').textContent = soldCount;
  document.getElementById('kpiTotalCost').textContent = fmtMoney(totalCostSum);
  document.getElementById('kpiAvgCost').textContent = fmtMoney(averageCardCost);
  document.getElementById('kpiTotalSales').textContent = fmtMoney(totalSalesSum);
  document.getElementById('kpiSoldCount').textContent = soldCount;
  
  const netProfitElement = document.getElementById('kpiNetProfit');
  netProfitElement.textContent = (netProfitAmount >= 0 ? '+' : '') + fmtMoney(netProfitAmount);
  netProfitElement.className = `text-2xl sm:text-3xl font-extrabold ${netProfitAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

  const roiElement = document.getElementById('kpiRoi');
  roiElement.textContent = (netProfitAmount >= 0 ? '+' : '') + netRoiRatio;
  roiElement.className = `font-bold ${netProfitAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
}

export function renderCardsList(onOpenSellModal, onOpenEditModal) {
  const filteredCards = store.cards.filter(singleCard => {
    const isSold = singleCard.status === 'ขายแล้ว' || singleCard.sellPrice > 0;
    if (store.filterStatus === 'stock' && isSold) return false;
    if (store.filterStatus === 'sold' && !isSold) return false;
    if (store.searchQuery) {
      const matchName = (singleCard.cardName || '').toLowerCase().includes(store.searchQuery);
      const matchSet = (singleCard.cardSet || '').toLowerCase().includes(store.searchQuery);
      const matchRarity = (singleCard.rarityCondition || '').toLowerCase().includes(store.searchQuery);
      return matchName || matchSet || matchRarity;
    }
    return true;
  });

  const gridElement = document.getElementById('cardsGrid');
  const tableContainer = document.getElementById('cardsTableWrapper');
  const emptyElement = document.getElementById('emptyState');

  if (filteredCards.length === 0) {
    gridElement.classList.add('hidden');
    tableContainer.classList.add('hidden');
    emptyElement.classList.remove('hidden');
    return;
  }

  emptyElement.classList.add('hidden');

  if (store.viewMode === 'grid') {
    tableContainer.classList.add('hidden');
    gridElement.classList.remove('hidden');
    gridElement.innerHTML = filteredCards.map(singleCard => renderCardGridItem(singleCard)).join('');
  } else {
    gridElement.classList.add('hidden');
    tableContainer.classList.remove('hidden');
    const tableBody = document.getElementById('cardsTableBody');
    tableBody.innerHTML = filteredCards.map(singleCard => renderCardTableRow(singleCard)).join('');
  }

  attachCardActionEvents(onOpenSellModal, onOpenEditModal);
}

function attachCardActionEvents(onOpenSellModal, onOpenEditModal) {
  document.querySelectorAll('.btn-open-sell').forEach(actionButton => {
    actionButton.onclick = () => {
      const cardRowId = Number(actionButton.dataset.rowid);
      const cardTitle = actionButton.dataset.cardname;
      const initialCost = Number(actionButton.dataset.buyprice);
      onOpenSellModal(cardRowId, cardTitle, initialCost);
    };
  });

  document.querySelectorAll('.btn-open-edit').forEach(actionButton => {
    actionButton.onclick = () => {
      const cardRowId = Number(actionButton.dataset.rowid);
      if (onOpenEditModal) {
        onOpenEditModal(cardRowId);
      }
    };
  });
}

function renderCardGridItem(cardEntry) {
  const isSold = cardEntry.status === 'ขายแล้ว' || cardEntry.sellPrice > 0;
  const netCardProfit = (Number(cardEntry.sellPrice || 0) - Number(cardEntry.buyPrice || 0));
  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="88" viewBox="0 0 64 88"><rect width="64" height="88" fill="%231e293b"/><text x="50%" y="50%" font-size="24" text-anchor="middle" dominant-baseline="central">🃏</text></svg>`;

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
          <span class="text-[11px] text-slate-400 truncate max-w-[140px] text-right" title="${cardEntry.rarityCondition || 'Normal'}">${cardEntry.rarityCondition || 'Normal'}</span>
        </div>

        <div class="mt-3 flex gap-3">
          ${cardEntry.imageUrl ? `
            <img src="${cardEntry.imageUrl}" alt="${cardEntry.cardName}" class="w-16 h-22 object-cover rounded-lg border border-slate-700 flex-shrink-0" onerror="this.onerror=null; this.src='${fallbackSvg}';">
          ` : `
            <div class="w-16 h-22 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center text-xl flex-shrink-0 text-slate-600">
              🃏
            </div>
          `}
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-bold text-white leading-snug truncate" title="${cardEntry.cardName}">${cardEntry.cardName}</h4>
            <p class="text-[11px] text-slate-400 truncate mt-0.5">${cardEntry.cardSet || '-'}</p>
            <div class="mt-2 text-[11px] text-slate-400">
              ซื้อ: <span class="text-slate-300">${formatDisplayDate(cardEntry.buyDate)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-slate-800/80">
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-400">ต้นทุน: <strong class="text-amber-400">${fmtMoney(cardEntry.buyPrice)}</strong></span>
          <div class="flex items-center gap-1.5">
            <button 
              data-rowid="${cardEntry.rowId}" 
              class="btn-open-edit px-2 py-1 text-[11px] rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white font-medium transition"
              title="แก้ไขข้อมูลการ์ด"
            >
              ✏️ แก้ไข
            </button>
            ${!isSold ? `
              <button 
                data-rowid="${cardEntry.rowId}" 
                data-cardname="${cardEntry.cardName.replace(/"/g, '&quot;')}" 
                data-buyprice="${cardEntry.buyPrice}" 
                class="btn-open-sell px-2.5 py-1 text-[11px] rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-medium transition"
              >
                💰 ขายแล้ว
              </button>
            ` : `
              <span class="text-slate-400">ขาย: <strong class="text-blue-400">${fmtMoney(cardEntry.sellPrice)}</strong></span>
            `}
          </div>
        </div>

        ${isSold ? `
          <div class="mt-2 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[11px]">
            <span class="text-slate-400">กำไรสุทธิ:</span>
            <span class="font-bold ${netCardProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
              ${netCardProfit >= 0 ? '+' : ''}${fmtMoney(netCardProfit)} (${cardEntry.roi || '0%'})
            </span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderCardTableRow(cardEntry) {
  const isSold = cardEntry.status === 'ขายแล้ว' || cardEntry.sellPrice > 0;
  const netCardProfit = (Number(cardEntry.sellPrice || 0) - Number(cardEntry.buyPrice || 0));
  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="88" viewBox="0 0 64 88"><rect width="64" height="88" fill="%231e293b"/><text x="50%" y="50%" font-size="24" text-anchor="middle" dominant-baseline="central">🃏</text></svg>`;

  return `
    <tr class="hover:bg-slate-800/40 transition">
      <td class="py-2.5 px-3">
        ${cardEntry.imageUrl ? `<img src="${cardEntry.imageUrl}" class="w-8 h-11 object-cover rounded border border-slate-700" onerror="this.src='${fallbackSvg}'">` : '🃏'}
      </td>
      <td class="py-2.5 px-4 font-semibold text-white">${cardEntry.cardName}</td>
      <td class="py-2.5 px-3 text-slate-400">${cardEntry.cardSet || '-'}</td>
      <td class="py-2.5 px-3 text-slate-300">${cardEntry.rarityCondition || '-'}</td>
      <td class="py-2.5 px-3 text-center">
        <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${isSold ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
          ${isSold ? 'ขายแล้ว' : 'มีในสต็อก'}
        </span>
      </td>
      <td class="py-2.5 px-3 text-slate-400">${formatDisplayDate(cardEntry.buyDate)}</td>
      <td class="py-2.5 px-3 text-right font-medium text-amber-400">${fmtMoney(cardEntry.buyPrice)}</td>
      <td class="py-2.5 px-3 text-slate-400">${formatDisplayDate(cardEntry.sellDate)}</td>
      <td class="py-2.5 px-3 text-right font-medium text-blue-400">${cardEntry.sellPrice ? fmtMoney(cardEntry.sellPrice) : '-'}</td>
      <td class="py-2.5 px-3 text-right font-bold ${netCardProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
        ${isSold ? ((netCardProfit >= 0 ? '+' : '') + fmtMoney(netCardProfit)) : '-'}
      </td>
      <td class="py-2.5 px-3 text-center">
        <div class="flex items-center justify-center gap-1.5">
          <button 
            data-rowid="${cardEntry.rowId}" 
            class="btn-open-edit px-2 py-1 text-[10px] rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            title="แก้ไขข้อมูล"
          >
            ✏️
          </button>
          ${!isSold ? `
            <button 
              data-rowid="${cardEntry.rowId}" 
              data-cardname="${cardEntry.cardName.replace(/"/g, '&quot;')}" 
              data-buyprice="${cardEntry.buyPrice}" 
              class="btn-open-sell px-2 py-1 text-[10px] rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition font-medium"
            >
              💰 ขายแล้ว
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
}
