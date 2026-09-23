/**
 * Google Sheets API Service Layer
 */
import { API_URL } from './config.js';

export async function fetchCardsFromSheet() {
  const fetchResponse = await fetch(API_URL);
  if (!fetchResponse.ok) {
    throw new Error(`HTTP error! status: ${fetchResponse.status}`);
  }
  return await fetchResponse.json();
}

export async function addCardToSheet(cardRecord) {
  const requestBody = {
    action: 'add',
    card: cardRecord
  };

  return await fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(requestBody)
  });
}

export async function editCardInSheet(cardRowId, cardRecord) {
  const requestBody = {
    action: 'edit',
    rowId: cardRowId,
    card: cardRecord
  };

  return await fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(requestBody)
  });
}

export async function deleteCardFromSheet(cardRowId) {
  const requestBody = {
    action: 'delete',
    rowId: cardRowId
  };

  return await fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(requestBody)
  });
}

export async function updateCardStatusInSheet(cardRowId, cardStatus, saleAmount, saleDate) {
  const requestBody = {
    action: 'updateStatus',
    rowId: cardRowId,
    status: cardStatus,
    sellPrice: saleAmount,
    sellDate: saleDate
  };

  return await fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(requestBody)
  });
}
