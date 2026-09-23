/**
 * Central State Management
 */
export const store = {
  cards: [],
  summary: {},
  filterStatus: 'all',
  filterSet: 'all',
  sortOrder: 'date_desc',
  searchQuery: '',
  viewMode: 'grid',
  activeSellCard: null,
  activeEditCard: null,
  currentImageBase64: '',
  editImageBase64: ''
};

const CACHE_STORAGE_KEY = 'op_card_tracker_cache_v1';

export function loadCachedData() {
  try {
    const rawCacheText = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!rawCacheText) return null;
    const parsedCacheRecord = JSON.parse(rawCacheText);
    if (!parsedCacheRecord || !Array.isArray(parsedCacheRecord.cards)) return null;
    return parsedCacheRecord;
  } catch (storageException) {
    return null;
  }
}

export function saveCachedData(cardRecords, summaryRecord) {
  try {
    const storagePacket = {
      cards: cardRecords,
      summary: summaryRecord,
      cachedAt: new Date().toISOString()
    };
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(storagePacket));
  } catch (storageException) {
    // Graceful fallback if storage quota exceeded
  }
}

export function setCards(newCards) {
  store.cards = newCards;
}

export function setSummary(newSummary) {
  store.summary = newSummary;
}

export function setFilterStatus(selectedStatus) {
  store.filterStatus = selectedStatus;
}

export function setFilterSet(chosenSet) {
  store.filterSet = chosenSet;
}

export function setSortOrder(chosenSort) {
  store.sortOrder = chosenSort;
}

export function setSearchQuery(queryString) {
  store.searchQuery = queryString;
}

export function setViewMode(selectedMode) {
  store.viewMode = selectedMode;
}

export function setActiveSellCard(targetCard) {
  store.activeSellCard = targetCard;
}

export function setActiveEditCard(targetCard) {
  store.activeEditCard = targetCard;
}

export function setCurrentImageBase64(imageString) {
  store.currentImageBase64 = imageString;
}

export function setEditImageBase64(imageString) {
  store.editImageBase64 = imageString;
}

export function getGeminiApiKey() {
  return localStorage.getItem('op_card_gemini_key') || '';
}

export function setGeminiApiKey(apiKeyString) {
  if (apiKeyString) {
    localStorage.setItem('op_card_gemini_key', apiKeyString.trim());
  } else {
    localStorage.removeItem('op_card_gemini_key');
  }
}
