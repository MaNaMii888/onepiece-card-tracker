/**
 * One Piece Card Tracker - Application Orchestrator (Main Controller)
 * Clean Architecture & Modular ES6 Design
 */

import { store, setCards, setSummary, setFilterStatus, setSearchQuery, setViewMode, setActiveSellCard, setCurrentImageBase64, getGeminiApiKey, setGeminiApiKey } from './modules/state.js';
import { fetchCardsFromSheet, addCardToSheet, updateCardStatusInSheet } from './modules/api.js';
import { scanCardWithGemini } from './modules/ai.js';
import { processCardImageFile } from './modules/imageProcessor.js';
import { showToast, updateKpiDisplay, renderCardsList, fmtMoney } from './modules/ui.js';

// DOM Elements
const refreshIcon = document.getElementById('refreshIcon');
const loadingState = document.getElementById('loadingState');
const addCardModal = document.getElementById('addCardModal');
const sellCardModal = document.getElementById('sellCardModal');
const apiKeyModal = document.getElementById('apiKeyModal');
const addCardForm = document.getElementById('addCardForm');
const searchInput = document.getElementById('searchInput');

// Load Data from Google Sheet
async function loadSheetData() {
  refreshIcon.classList.add('animate-spin');
  loadingState.classList.remove('hidden');
  document.getElementById('cardsGrid').classList.add('hidden');
  document.getElementById('cardsTableWrapper').classList.add('hidden');
  document.getElementById('emptyState').classList.add('hidden');

  try {
    const data = await fetchCardsFromSheet();
    if (data.success) {
      const validCards = (data.cards || []).filter(c => c.cardName && c.cardName !== 'รูปภาพหน้าการ์ด' && c.cardName !== 'ชื่อการ์ด');
      setCards(validCards);
      setSummary(data.summary || {});
      updateKpiDisplay();
      renderCardsList(openSellModal);
    } else {
      showToast('เกิดข้อผิดพลาด: ' + (data.message || 'ไม่สามารถโหลดข้อมูลได้'), 'error');
    }
  } catch (err) {
    showToast('ไม่สามารถเชื่อมต่อ Google Sheets API ได้: ' + err.message, 'error');
  } finally {
    refreshIcon.classList.remove('animate-spin');
    loadingState.classList.add('hidden');
  }
}

// Add Card Modal Controls
function openAddCardModal() {
  clearCardImage();
  document.getElementById('formBuyDate').value = new Date().toISOString().split('T')[0];
  addCardModal.classList.remove('hidden');
  addCardModal.classList.add('flex');
  setTimeout(() => document.getElementById('imageDropzone').focus(), 100);
}

function closeAddCardModal() {
  addCardModal.classList.add('hidden');
  addCardModal.classList.remove('flex');
}

// Image Dropzone & File Handling
async function handleFile(file) {
  if (!file) return;
  try {
    const processed = await processCardImageFile(file);
    setCurrentImageBase64(processed.base64);

    document.getElementById('previewImgEl').src = processed.base64;
    document.getElementById('previewImgMeta').textContent = `${processed.name} (${processed.sizeKb} KB)`;
    document.getElementById('dropzoneEmpty').classList.add('hidden');
    const previewEl = document.getElementById('dropzonePreview');
    previewEl.classList.remove('hidden');
    previewEl.classList.add('flex');
    showToast('รับรูปภาพเรียบร้อยแล้ว! 📸', 'success');

    if (getGeminiApiKey()) {
      runAiScan();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function clearCardImage() {
  setCurrentImageBase64('');
  document.getElementById('cardFileInput').value = '';
  document.getElementById('previewImgEl').src = '';
  document.getElementById('dropzoneEmpty').classList.remove('hidden');
  const previewEl = document.getElementById('dropzonePreview');
  previewEl.classList.add('hidden');
  previewEl.classList.remove('flex');
}

// AI Vision Scan Trigger
async function runAiScan() {
  if (!store.currentImageBase64) {
    showToast('กรุณาวางรูปภาพการ์ดก่อนสแกน', 'error');
    return;
  }

  const btnText = document.getElementById('aiScanBtnText');
  const btn = document.getElementById('btnAiScan');
  btn.disabled = true;
  btnText.textContent = 'กำลังสแกน...';

  try {
    const base64Data = store.currentImageBase64.split(',')[1];
    const mimeType = store.currentImageBase64.split(';')[0].split(':')[1];
    const cardInfo = await scanCardWithGemini(base64Data, mimeType);

    if (cardInfo.cardName) document.getElementById('formCardName').value = cardInfo.cardName;
    if (cardInfo.cardSet) document.getElementById('formCardSet').value = cardInfo.cardSet;
    if (cardInfo.rarityCondition) document.getElementById('formRarity').value = cardInfo.rarityCondition;

    showToast('สแกนและกรอกข้อมูลการ์ดเรียบร้อย! ✨', 'success');
  } catch (err) {
    if (err.message === 'MISSING_API_KEY') {
      openApiKeyModal();
      showToast('กรุณาใส่ Gemini API Key ฟรี เพื่อเปิดใช้ระบบสแกน', 'info');
    } else {
      showToast('สแกนไม่สำเร็จ: ' + err.message, 'error');
    }
  } finally {
    btn.disabled = false;
    btnText.textContent = 'AI สแกนชื่อ & สภาพ';
  }
}

// Form Submission
async function handleFormSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitAdd');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳ กำลังบันทึกลงชีต...</span>';

  const cardPayload = {
    cardName: document.getElementById('formCardName').value.trim(),
    cardSet: document.getElementById('formCardSet').value.trim(),
    rarityCondition: document.getElementById('formRarity').value.trim(),
    buyPrice: Number(document.getElementById('formBuyPrice').value) || 0,
    buyDate: document.getElementById('formBuyDate').value,
    imageUrl: document.getElementById('formImageUrl').value.trim(),
    imageBase64: store.currentImageBase64 || '',
    status: 'มีในสต็อก'
  };

  try {
    await addCardToSheet(cardPayload);
    showToast('บันทึกการ์ดและอัปโหลดรูปลง Google Sheets สำเร็จ! 📊', 'success');
    closeAddCardModal();
    addCardForm.reset();
    clearCardImage();
    setTimeout(loadSheetData, 2000);
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>💾 บันทึกลง Google Sheet</span>';
  }
}

// Sell Modal Controls
function openSellModal(rowId, name, buyPrice) {
  setActiveSellCard({ rowId, name, buyPrice });
  document.getElementById('sellCardNameDisplay').textContent = name;
  document.getElementById('sellCardBuyDisplay').textContent = fmtMoney(buyPrice);
  document.getElementById('sellDateInput').value = new Date().toISOString().split('T')[0];
  document.getElementById('sellPriceInput').value = '';
  sellCardModal.classList.remove('hidden');
  sellCardModal.classList.add('flex');
}

function closeSellModal() {
  sellCardModal.classList.add('hidden');
  sellCardModal.classList.remove('flex');
}

async function confirmSellCard() {
  const sellPrice = Number(document.getElementById('sellPriceInput').value);
  if (!sellPrice || sellPrice <= 0) {
    showToast('กรุณาระบุราคาขายที่ถูกต้อง', 'error');
    return;
  }

  const btn = document.getElementById('btnConfirmSell');
  btn.disabled = true;
  btn.textContent = 'กำลังบันทึก...';

  try {
    await updateCardStatusInSheet(
      store.activeSellCard.rowId,
      'ขายแล้ว',
      sellPrice,
      document.getElementById('sellDateInput').value
    );
    showToast(`ปิดการขาย ${store.activeSellCard.name} เรียบร้อย! 💰`, 'success');
    closeSellModal();
    setTimeout(loadSheetData, 1200);
  } catch (err) {
    showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'ยืนยันการขาย';
  }
}

// API Key Modal Controls
function openApiKeyModal() {
  document.getElementById('geminiApiKeyInput').value = getGeminiApiKey();
  apiKeyModal.classList.remove('hidden');
  apiKeyModal.classList.add('flex');
}

function closeApiKeyModal() {
  apiKeyModal.classList.add('hidden');
  apiKeyModal.classList.remove('flex');
}

function saveApiKey() {
  const key = document.getElementById('geminiApiKeyInput').value.trim();
  setGeminiApiKey(key);
  showToast(key ? 'บันทึก Gemini API Key เรียบร้อยแล้ว! 🤖' : 'ลบ API Key แล้ว', 'success');
  closeApiKeyModal();
}

// Filter and View Mode Handlers
function setFilter(status) {
  setFilterStatus(status);
  ['tabFilterAll', 'tabFilterStock', 'tabFilterSold'].forEach(id => {
    document.getElementById(id).className = "px-3 py-1.5 rounded-lg font-medium transition text-slate-400 hover:text-white";
  });
  const activeId = status === 'all' ? 'tabFilterAll' : status === 'stock' ? 'tabFilterStock' : 'tabFilterSold';
  document.getElementById(activeId).className = "px-3 py-1.5 rounded-lg font-medium transition bg-cyan-500 text-slate-950 font-bold";
  renderCardsList(openSellModal);
}

function setView(mode) {
  setViewMode(mode);
  document.getElementById('btnViewGrid').className = mode === 'grid' ? 'p-1.5 rounded-lg text-cyan-400 bg-slate-800 transition' : 'p-1.5 rounded-lg text-slate-400 hover:text-white transition';
  document.getElementById('btnViewTable').className = mode === 'table' ? 'p-1.5 rounded-lg text-cyan-400 bg-slate-800 transition' : 'p-1.5 rounded-lg text-slate-400 hover:text-white transition';
  renderCardsList(openSellModal);
}

// Event Listeners Setup
function initEventListeners() {
  // Global Clipboard Paste Listener (Ctrl+V)
  window.addEventListener('paste', (e) => {
    if (addCardModal && !addCardModal.classList.contains('hidden')) {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          handleFile(blob);
          e.preventDefault();
          break;
        }
      }
    }
  });

  // Search input with debounce/instant filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      setSearchQuery(e.target.value.trim().toLowerCase());
      renderCardsList(openSellModal);
    });
  }

  // File Picker
  const fileInput = document.getElementById('cardFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  }

  // Form submit
  if (addCardForm) {
    addCardForm.addEventListener('submit', handleFormSubmit);
  }

  // Expose global actions to window for HTML inline onclicks
  window.loadSheetData = loadSheetData;
  window.openAddCardModal = openAddCardModal;
  window.closeAddCardModal = closeAddCardModal;
  window.clearCardImage = clearCardImage;
  window.runAiCardScan = runAiScan;
  window.openApiKeyModal = openApiKeyModal;
  window.closeApiKeyModal = closeApiKeyModal;
  window.saveApiKey = saveApiKey;
  window.closeSellModal = closeSellModal;
  window.confirmSellCard = confirmSellCard;
  window.setStatusFilter = setFilter;
  window.setViewMode = setView;
}

// Bootstrap Application
window.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadSheetData();
});
