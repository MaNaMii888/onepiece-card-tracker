/**
 * One Piece Card Tracker - Application Orchestrator (Main Controller)
 * Clean Architecture & Modular ES6 Design
 */

import { 
  store, 
  setCards, 
  setSummary, 
  setFilterStatus, 
  setFilterSet,
  setSortOrder,
  setSearchQuery, 
  setViewMode, 
  setActiveSellCard, 
  setActiveEditCard,
  setCurrentImageBase64, 
  setEditImageBase64,
  getGeminiApiKey, 
  setGeminiApiKey,
  loadCachedData,
  saveCachedData
} from './modules/state.js';
import { 
  fetchCardsFromSheet, 
  addCardToSheet, 
  editCardInSheet,
  deleteCardFromSheet,
  updateCardStatusInSheet 
} from './modules/api.js';
import { scanCardWithGemini } from './modules/ai.js';
import { processCardImageFile } from './modules/imageProcessor.js';
import { showToast, updateKpiDisplay, renderCardsList, fmtMoney, updateSyncStatusBadge } from './modules/ui.js';
import { 
  aggregateMonthlyMetrics, 
  renderPerformanceComboChart,
  aggregateSetDistribution,
  renderAllocationDonutChart
} from './modules/analytics.js';

// DOM Elements Cache
const refreshIcon = document.getElementById('refreshIcon');
const loadingState = document.getElementById('loadingState');
const addCardModal = document.getElementById('addCardModal');
const editCardModal = document.getElementById('editCardModal');
const sellCardModal = document.getElementById('sellCardModal');
const apiKeyModal = document.getElementById('apiKeyModal');
const addCardForm = document.getElementById('addCardForm');
const searchInputElement = document.getElementById('searchInput');

let currentAnalyticsScope = 6;
let isAnalyticsSectionOpen = false;

// Load Data from Google Sheet with Stale-While-Revalidate Caching
async function loadSheetData() {
  const cachedPacket = loadCachedData();
  const hasCachedContent = cachedPacket && Array.isArray(cachedPacket.cards) && cachedPacket.cards.length > 0;

  if (hasCachedContent) {
    setCards(cachedPacket.cards);
    setSummary(cachedPacket.summary || {});
    updateKpiDisplay();
    renderCardsList(openSellModal, openEditModal);
    refreshAnalyticsChart();
    updateSyncStatusBadge('cached');
    loadingState.classList.add('hidden');
  } else {
    loadingState.classList.remove('hidden');
    document.getElementById('cardsGrid').classList.add('hidden');
    document.getElementById('cardsTableWrapper').classList.add('hidden');
    document.getElementById('emptyState').classList.add('hidden');
  }

  refreshIcon.classList.add('animate-spin');
  updateSyncStatusBadge('syncing');

  try {
    const sheetResponse = await fetchCardsFromSheet();
    if (sheetResponse.success) {
      const validCards = (sheetResponse.cards || []).filter(singleCard => {
        const title = singleCard.cardName;
        return title && title !== 'รูปภาพหน้าการ์ด' && title !== 'ชื่อการ์ด';
      });
      setCards(validCards);
      setSummary(sheetResponse.summary || {});
      saveCachedData(validCards, sheetResponse.summary || {});
      updateKpiDisplay();
      renderCardsList(openSellModal, openEditModal);
      refreshAnalyticsChart();
      updateSyncStatusBadge('synced');
    } else {
      updateSyncStatusBadge(hasCachedContent ? 'cached' : 'error');
      showToast('เกิดข้อผิดพลาด: ' + (sheetResponse.message || 'ไม่สามารถโหลดข้อมูลได้'), 'error');
    }
  } catch (networkError) {
    updateSyncStatusBadge(hasCachedContent ? 'error' : 'error');
    if (!hasCachedContent) {
      showToast('ไม่สามารถเชื่อมต่อ Google Sheets API ได้: ' + networkError.message, 'error');
    }
  } finally {
    refreshIcon.classList.remove('animate-spin');
    loadingState.classList.add('hidden');
  }
}

// Portfolio Analytics Controls
function refreshAnalyticsChart() {
  if (!isAnalyticsSectionOpen) return;

  const performanceCanvas = document.getElementById('performanceChartCanvas');
  if (performanceCanvas) {
    const monthlyMetrics = aggregateMonthlyMetrics(store.cards, currentAnalyticsScope);
    renderPerformanceComboChart(performanceCanvas, monthlyMetrics);
  }

  const allocationCanvas = document.getElementById('allocationChartCanvas');
  if (allocationCanvas) {
    const allocationMetrics = aggregateSetDistribution(store.cards);
    renderAllocationDonutChart(allocationCanvas, allocationMetrics);
  }
}

function toggleAnalyticsView() {
  const analyticsSection = document.getElementById('analyticsSection');
  const toggleButton = document.getElementById('btnToggleAnalytics');
  if (!analyticsSection) return;

  isAnalyticsSectionOpen = !isAnalyticsSectionOpen;
  if (isAnalyticsSectionOpen) {
    analyticsSection.classList.remove('hidden');
    toggleButton.classList.add('bg-cyan-500/20', 'border-cyan-500/40', 'text-cyan-400');
    refreshAnalyticsChart();
  } else {
    analyticsSection.classList.add('hidden');
    toggleButton.classList.remove('bg-cyan-500/20', 'border-cyan-500/40', 'text-cyan-400');
  }
}

function setAnalyticsTimeScope(monthsCount) {
  currentAnalyticsScope = monthsCount;
  const buttonConfigs = [
    { buttonId: 'btnScope6M', months: 6 },
    { buttonId: 'btnScope12M', months: 12 },
    { buttonId: 'btnScopeAll', months: 0 }
  ];

  buttonConfigs.forEach(configEntry => {
    const buttonElement = document.getElementById(configEntry.buttonId);
    if (!buttonElement) return;
    if (configEntry.months === monthsCount) {
      buttonElement.className = 'px-2.5 py-1 rounded-lg font-medium transition bg-cyan-500 text-slate-950 font-bold';
    } else {
      buttonElement.className = 'px-2.5 py-1 rounded-lg font-medium transition text-slate-400 hover:text-white';
    }
  });

  refreshAnalyticsChart();
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

// Add Card Image & File Intake
async function handleFile(selectedFile) {
  if (!selectedFile) return;
  try {
    const processedImage = await processCardImageFile(selectedFile);
    setCurrentImageBase64(processedImage.base64);

    document.getElementById('previewImgEl').src = processedImage.base64;
    document.getElementById('previewImgMeta').textContent = `${processedImage.name} (${processedImage.sizeKb} KB)`;
    document.getElementById('dropzoneEmpty').classList.add('hidden');
    const previewContainer = document.getElementById('dropzonePreview');
    previewContainer.classList.remove('hidden');
    previewContainer.classList.add('flex');
    showToast('รับรูปภาพเรียบร้อยแล้ว! 📸', 'success');

    if (getGeminiApiKey()) {
      runAiScan();
    }
  } catch (fileError) {
    showToast(fileError.message, 'error');
  }
}

function clearCardImage() {
  setCurrentImageBase64('');
  document.getElementById('cardFileInput').value = '';
  document.getElementById('previewImgEl').src = '';
  document.getElementById('dropzoneEmpty').classList.remove('hidden');
  const previewContainer = document.getElementById('dropzonePreview');
  previewContainer.classList.add('hidden');
  previewContainer.classList.remove('flex');
}

// AI Vision Scan Trigger
async function runAiScan() {
  if (!store.currentImageBase64) {
    showToast('กรุณาวางรูปภาพการ์ดก่อนสแกน', 'error');
    return;
  }

  const scanTextElement = document.getElementById('aiScanBtnText');
  const scanButton = document.getElementById('btnAiScan');
  scanButton.disabled = true;
  scanTextElement.textContent = 'กำลังสแกน...';

  try {
    const base64Content = store.currentImageBase64.split(',')[1];
    const imageMimeType = store.currentImageBase64.split(';')[0].split(':')[1];
    const scannedCard = await scanCardWithGemini(base64Content, imageMimeType);

    if (scannedCard.cardName) document.getElementById('formCardName').value = scannedCard.cardName;
    if (scannedCard.cardSet) document.getElementById('formCardSet').value = scannedCard.cardSet;
    if (scannedCard.rarityCondition) document.getElementById('formRarity').value = scannedCard.rarityCondition;

    showToast('สแกนและกรอกข้อมูลการ์ดเรียบร้อย! ✨', 'success');
  } catch (scanError) {
    if (scanError.message === 'MISSING_API_KEY') {
      openApiKeyModal();
      showToast('กรุณาใส่ Gemini API Key ฟรี เพื่อเปิดใช้ระบบสแกน', 'info');
    } else {
      showToast('สแกนไม่สำเร็จ: ' + scanError.message, 'error');
    }
  } finally {
    scanButton.disabled = false;
    scanTextElement.textContent = 'AI สแกนชื่อ & สภาพ';
  }
}

// Add Form Submission
async function handleFormSubmit(submitEvent) {
  submitEvent.preventDefault();
  const submitButton = document.getElementById('btnSubmitAdd');
  submitButton.disabled = true;
  submitButton.innerHTML = '<span>⏳ กำลังบันทึกลงชีต...</span>';

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
  } catch (submitError) {
    showToast('เกิดข้อผิดพลาดในการบันทึก: ' + submitError.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<span>💾 บันทึกลง Google Sheet</span>';
  }
}

// Edit Card Modal Controls
function openEditModal(cardRowId) {
  const matchingCard = store.cards.find(singleCard => Number(singleCard.rowId) === Number(cardRowId));
  if (!matchingCard) {
    showToast('ไม่พบข้อมูลการ์ดที่ต้องการแก้ไข', 'error');
    return;
  }

  setActiveEditCard(matchingCard);
  setEditImageBase64('');

  document.getElementById('editCardRowId').value = matchingCard.rowId;
  document.getElementById('editFormCardName').value = matchingCard.cardName || '';
  document.getElementById('editFormCardSet').value = matchingCard.cardSet || '';
  document.getElementById('editFormRarity').value = matchingCard.rarityCondition || '';
  document.getElementById('editFormStatus').value = matchingCard.status || 'มีในสต็อก';
  document.getElementById('editFormBuyPrice').value = matchingCard.buyPrice || 0;
  document.getElementById('editFormBuyDate').value = matchingCard.buyDate || '';
  document.getElementById('editFormSellPrice').value = matchingCard.sellPrice || '';
  document.getElementById('editFormSellDate').value = matchingCard.sellDate || '';

  const editPreviewElement = document.getElementById('editPreviewImgEl');
  const editStatusElement = document.getElementById('editImageStatusText');
  const hasValidImage = matchingCard.imageUrl && (matchingCard.imageUrl.startsWith('http://') || matchingCard.imageUrl.startsWith('https://') || matchingCard.imageUrl.startsWith('data:image'));
  if (hasValidImage) {
    editPreviewElement.src = matchingCard.imageUrl;
    editStatusElement.textContent = 'รูปภาพปัจจุบันจากการ์ด';
  } else {
    editPreviewElement.src = '';
    editStatusElement.textContent = 'ยังไม่มีรูปภาพ (คลิกเพื่อเลือกไฟล์ หรือ Ctrl+V)';
  }

  editCardModal.classList.remove('hidden');
  editCardModal.classList.add('flex');
}

function closeEditModal() {
  editCardModal.classList.add('hidden');
  editCardModal.classList.remove('flex');
  setActiveEditCard(null);
  setEditImageBase64('');
}

async function handleEditFile(selectedFile) {
  if (!selectedFile) return;
  try {
    const processedImage = await processCardImageFile(selectedFile);
    setEditImageBase64(processedImage.base64);

    document.getElementById('editPreviewImgEl').src = processedImage.base64;
    document.getElementById('editImageStatusText').textContent = `รูปใหม่พร้อมบันทึก (${processedImage.sizeKb} KB)`;
    showToast('เลือกรูปภาพใหม่เรียบร้อย 📸', 'success');
  } catch (fileError) {
    showToast(fileError.message, 'error');
  }
}

function clearEditCardImage() {
  setEditImageBase64('');
  document.getElementById('editCardFileInput').value = '';
  document.getElementById('editPreviewImgEl').src = '';
  document.getElementById('editImageStatusText').textContent = 'ลบรูปภาพแล้ว (กดบันทึกเพื่ออัปเดตชีต)';
  if (store.activeEditCard) {
    store.activeEditCard.imageUrl = '';
    store.activeEditCard.clearImage = true;
  }
}

async function handleEditFormSubmit(submitEvent) {
  submitEvent.preventDefault();
  const cardRowId = Number(document.getElementById('editCardRowId').value);
  if (!cardRowId) {
    showToast('ไม่พบรหัสแถวการ์ด', 'error');
    return;
  }

  const submitButton = document.getElementById('btnSubmitEdit');
  submitButton.disabled = true;
  submitButton.innerHTML = '<span>⏳ กำลังบันทึก...</span>';

  const validOriginalUrl = (store.activeEditCard && store.activeEditCard.imageUrl && (store.activeEditCard.imageUrl.startsWith('http://') || store.activeEditCard.imageUrl.startsWith('https://'))) ? store.activeEditCard.imageUrl : '';

  const updatedRecord = {
    cardName: document.getElementById('editFormCardName').value.trim(),
    cardSet: document.getElementById('editFormCardSet').value.trim(),
    rarityCondition: document.getElementById('editFormRarity').value.trim(),
    status: document.getElementById('editFormStatus').value,
    buyPrice: Number(document.getElementById('editFormBuyPrice').value) || 0,
    buyDate: document.getElementById('editFormBuyDate').value,
    sellPrice: Number(document.getElementById('editFormSellPrice').value) || 0,
    sellDate: document.getElementById('editFormSellDate').value,
    imageUrl: validOriginalUrl,
    imageBase64: store.editImageBase64 || '',
    clearImage: store.activeEditCard?.clearImage || false
  };

  try {
    await editCardInSheet(cardRowId, updatedRecord);
    showToast('อัปเดตข้อมูลการ์ดเรียบร้อย! ✨', 'success');
    closeEditModal();
    setTimeout(loadSheetData, 1500);
  } catch (editError) {
    showToast('บันทึกไม่สำเร็จ: ' + editError.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<span>💾 บันทึกการแก้ไข</span>';
  }
}

async function handleDeleteCardClick() {
  const cardRowId = Number(document.getElementById('editCardRowId').value);
  const cardTitle = document.getElementById('editFormCardName').value;
  if (!cardRowId) return;

  const isConfirmed = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบการ์ด "${cardTitle}" ออกจากระบบ?`);
  if (!isConfirmed) return;

  const deleteButton = document.getElementById('btnDeleteCard');
  deleteButton.disabled = true;
  deleteButton.textContent = 'กำลังลบ...';

  try {
    await deleteCardFromSheet(cardRowId);
    showToast(`ลบการ์ด "${cardTitle}" เรียบร้อยแล้ว 🗑️`, 'success');
    closeEditModal();
    setTimeout(loadSheetData, 1500);
  } catch (deleteError) {
    showToast('เกิดข้อผิดพลาดในการลบ: ' + deleteError.message, 'error');
  } finally {
    deleteButton.disabled = false;
    deleteButton.innerHTML = '<span>🗑️</span> <span class="hidden sm:inline">ลบการ์ด</span>';
  }
}

// Sell Modal Controls
function openSellModal(cardRowId, cardTitle, initialCost) {
  setActiveSellCard({ rowId: cardRowId, name: cardTitle, buyPrice: initialCost });
  document.getElementById('sellCardNameDisplay').textContent = cardTitle;
  document.getElementById('sellCardBuyDisplay').textContent = fmtMoney(initialCost);
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
  const saleAmount = Number(document.getElementById('sellPriceInput').value);
  if (!saleAmount || saleAmount <= 0) {
    showToast('กรุณาระบุราคาขายที่ถูกต้อง', 'error');
    return;
  }

  const confirmButton = document.getElementById('btnConfirmSell');
  confirmButton.disabled = true;
  confirmButton.textContent = 'กำลังบันทึก...';

  try {
    await updateCardStatusInSheet(
      store.activeSellCard.rowId,
      'ขายแล้ว',
      saleAmount,
      document.getElementById('sellDateInput').value
    );
    showToast(`ปิดการขาย ${store.activeSellCard.name} เรียบร้อย! 💰`, 'success');
    closeSellModal();
    setTimeout(loadSheetData, 1200);
  } catch (sellError) {
    showToast('เกิดข้อผิดพลาด: ' + sellError.message, 'error');
  } finally {
    confirmButton.disabled = false;
    confirmButton.textContent = 'ยืนยันการขาย';
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
  const enteredKey = document.getElementById('geminiApiKeyInput').value.trim();
  setGeminiApiKey(enteredKey);
  showToast(enteredKey ? 'บันทึก Gemini API Key เรียบร้อยแล้ว! 🤖' : 'ลบ API Key แล้ว', 'success');
  closeApiKeyModal();
}

// Filter and View Mode Handlers
function setFilter(filterType) {
  setFilterStatus(filterType);
  ['tabFilterAll', 'tabFilterStock', 'tabFilterSold'].forEach(tabId => {
    document.getElementById(tabId).className = "px-3 py-1.5 rounded-lg font-medium transition text-slate-400 hover:text-white";
  });
  const activeTabId = filterType === 'all' ? 'tabFilterAll' : filterType === 'stock' ? 'tabFilterStock' : 'tabFilterSold';
  document.getElementById(activeTabId).className = "px-3 py-1.5 rounded-lg font-medium transition bg-cyan-500 text-slate-950 font-bold";
  renderCardsList(openSellModal, openEditModal);
}

function setView(viewStyle) {
  setViewMode(viewStyle);
  document.getElementById('btnViewGrid').className = viewStyle === 'grid' ? 'p-1.5 rounded-lg text-cyan-400 bg-slate-800 transition' : 'p-1.5 rounded-lg text-slate-400 hover:text-white transition';
  document.getElementById('btnViewTable').className = viewStyle === 'table' ? 'p-1.5 rounded-lg text-cyan-400 bg-slate-800 transition' : 'p-1.5 rounded-lg text-slate-400 hover:text-white transition';
  renderCardsList(openSellModal, openEditModal);
}

function handleSetFilterChange(chosenSet) {
  setFilterSet(chosenSet);
  renderCardsList(openSellModal, openEditModal);
}

function handleSortOrderChange(chosenSort) {
  setSortOrder(chosenSort);
  renderCardsList(openSellModal, openEditModal);
}

// Event Listeners Setup
function initEventListeners() {
  // Global Clipboard Paste Listener (Ctrl+V)
  window.addEventListener('paste', (pasteEvent) => {
    const isAddOpen = addCardModal && !addCardModal.classList.contains('hidden');
    const isEditOpen = editCardModal && !editCardModal.classList.contains('hidden');
    if (!isAddOpen && !isEditOpen) return;

    const clipboardEntries = (pasteEvent.clipboardData || pasteEvent.originalEvent?.clipboardData)?.items;
    if (!clipboardEntries) return;

    for (let entryIndex = 0; entryIndex < clipboardEntries.length; entryIndex++) {
      if (clipboardEntries[entryIndex].type.indexOf('image') !== -1) {
        const imageFileBlob = clipboardEntries[entryIndex].getAsFile();
        if (isAddOpen) {
          handleFile(imageFileBlob);
        } else if (isEditOpen) {
          handleEditFile(imageFileBlob);
        }
        pasteEvent.preventDefault();
        break;
      }
    }
  });

  // Search filter listener
  if (searchInputElement) {
    searchInputElement.addEventListener('input', (inputEvent) => {
      setSearchQuery(inputEvent.target.value.trim().toLowerCase());
      renderCardsList(openSellModal, openEditModal);
    });
  }

  // File Picker for Add Modal
  const fileInputElement = document.getElementById('cardFileInput');
  if (fileInputElement) {
    fileInputElement.addEventListener('change', (changeEvent) => handleFile(changeEvent.target.files[0]));
  }

  // Form submit for Add
  if (addCardForm) {
    addCardForm.addEventListener('submit', handleFormSubmit);
  }

  // Expose global actions to window for HTML inline attributes
  window.loadSheetData = loadSheetData;
  window.openAddCardModal = openAddCardModal;
  window.closeAddCardModal = closeAddCardModal;
  window.openEditModal = openEditModal;
  window.closeEditModal = closeEditModal;
  window.handleEditFileSelect = (selectEvent) => handleEditFile(selectEvent.target.files[0]);
  window.clearEditCardImage = clearEditCardImage;
  window.handleEditFormSubmit = handleEditFormSubmit;
  window.handleDeleteCardClick = handleDeleteCardClick;
  window.clearCardImage = clearCardImage;
  window.runAiCardScan = runAiScan;
  window.openApiKeyModal = openApiKeyModal;
  window.closeApiKeyModal = closeApiKeyModal;
  window.saveApiKey = saveApiKey;
  window.closeSellModal = closeSellModal;
  window.confirmSellCard = confirmSellCard;
  window.setStatusFilter = setFilter;
  window.setViewMode = setView;
  window.handleSetFilterChange = handleSetFilterChange;
  window.handleSortOrderChange = handleSortOrderChange;
  window.toggleAnalyticsView = toggleAnalyticsView;
  window.setAnalyticsTimeScope = setAnalyticsTimeScope;
}

// Bootstrap Application
window.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadSheetData();
});
