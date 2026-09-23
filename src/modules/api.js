/**
 * Google Sheets API Service Layer
 */
import { API_URL } from './config.js';

export async function fetchCardsFromSheet() {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

export async function addCardToSheet(cardData) {
  const payload = {
    action: 'add',
    card: cardData
  };

  return await fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function updateCardStatusInSheet(rowId, status, sellPrice, sellDate) {
  const payload = {
    action: 'updateStatus',
    rowId: rowId,
    status: status,
    sellPrice: sellPrice,
    sellDate: sellDate
  };

  return await fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
