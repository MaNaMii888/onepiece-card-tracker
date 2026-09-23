/**
 * Central State Management
 */
export const store = {
  cards: [],
  summary: {},
  filterStatus: 'all',
  searchQuery: '',
  viewMode: 'grid',
  activeSellCard: null,
  activeEditCard: null,
  currentImageBase64: '',
  editImageBase64: ''
};

export function setCards(newCards) {
  store.cards = newCards;
}

export function setSummary(newSummary) {
  store.summary = newSummary;
}

export function setFilterStatus(selectedStatus) {
  store.filterStatus = selectedStatus;
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
