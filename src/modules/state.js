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
  currentImageBase64: ''
};

export function setCards(newCards) {
  store.cards = newCards;
}

export function setSummary(newSummary) {
  store.summary = newSummary;
}

export function setFilterStatus(status) {
  store.filterStatus = status;
}

export function setSearchQuery(query) {
  store.searchQuery = query;
}

export function setViewMode(mode) {
  store.viewMode = mode;
}

export function setActiveSellCard(card) {
  store.activeSellCard = card;
}

export function setCurrentImageBase64(base64) {
  store.currentImageBase64 = base64;
}

export function getGeminiApiKey() {
  return localStorage.getItem('op_card_gemini_key') || '';
}

export function setGeminiApiKey(key) {
  if (key) {
    localStorage.setItem('op_card_gemini_key', key.trim());
  } else {
    localStorage.removeItem('op_card_gemini_key');
  }
}
