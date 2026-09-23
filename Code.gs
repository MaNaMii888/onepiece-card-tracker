/**
 * One Piece Card Tracker API Backend
 */
const SHEET_NAME = 'onepiece'; // ตรงกับชื่อแท็บในชีตของผู้ใช้
const DATA_START_ROW = 8;
const START_COLUMN = 2; // Column B (Column A is reserved spacer in template)
const NUM_COLUMNS = 11; // Columns B to L (Image, Name, Set, Rarity, Status, BuyDate, BuyPrice, SellDate, SellPrice, Profit, ROI)

function getTargetSheet(spreadsheet) {
  return spreadsheet.getSheetByName(SHEET_NAME) || 
         spreadsheet.getSheetByName('Sheet1') || 
         spreadsheet.getActiveSheet();
}

// ฟังก์ชันสำหรับกด Run ใน Apps Script ครั้งแรกเพื่อกดยืนยันสิทธิ์ Google Drive (Authorize)
function authorizeAndTest() {
  const folder = getOrCreateImagesFolder();
  Logger.log("Google Drive เชื่อมต่อสำเร็จ! โฟลเดอร์ ID: " + folder.getId());
}

function doGet(e) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getTargetSheet(spreadsheet);
    const lastRow = sheet.getLastRow();
    
    const totalCards = sheet.getRange("B4").getValue() || 0;
    const totalCost = sheet.getRange("D4").getValue() || 0;
    const totalSales = sheet.getRange("F4").getValue() || 0;
    const netProfit = sheet.getRange("H4").getValue() || 0;
    
    const cardCollection = [];
    if (lastRow >= DATA_START_ROW) {
      const rowValues = sheet.getRange(DATA_START_ROW, START_COLUMN, lastRow - DATA_START_ROW + 1, NUM_COLUMNS).getValues();
      const formulaValues = sheet.getRange(DATA_START_ROW, START_COLUMN, lastRow - DATA_START_ROW + 1, 1).getFormulas();
      
      for (let rowIndex = 0; rowIndex < rowValues.length; rowIndex++) {
        const rowCells = rowValues[rowIndex];
        const cardTitle = String(rowCells[1] || '').trim();
        if (!cardTitle || cardTitle === 'ชื่อการ์ด' || cardTitle === 'รูปภาพหน้าการ์ด') continue;
        
        let cardImageUrl = '';
        if (formulaValues[rowIndex] && formulaValues[rowIndex][0]) {
          const formulaMatch = formulaValues[rowIndex][0].match(/=IMAGE\("([^"]+)"\)/i);
          if (formulaMatch) cardImageUrl = formulaMatch[1].trim();
        }
        if (!cardImageUrl && rowCells[0]) {
          const cellStr = String(rowCells[0]).trim();
          if (cellStr.startsWith('http://') || cellStr.startsWith('https://')) {
            cardImageUrl = cellStr;
          }
        }
        
        if (cardImageUrl.includes('drive.google.com/file/d/')) {
          const driveFileId = cardImageUrl.split('/d/')[1].split('/')[0];
          cardImageUrl = `https://lh3.googleusercontent.com/d/${driveFileId}`;
        }
        
        // กรองค่าที่ไม่ใช่ URL รูปภาพออก ป้องกันชื่อการ์ดหลุดมาเป็นรูป
        if (!cardImageUrl.startsWith('http://') && !cardImageUrl.startsWith('https://')) {
          cardImageUrl = '';
        }
        
        cardCollection.push({
          rowId: DATA_START_ROW + rowIndex,
          imageUrl: cardImageUrl,
          cardName: cardTitle,
          cardSet: String(rowCells[2] || ''),
          rarityCondition: String(rowCells[3] || ''),
          status: String(rowCells[4] || 'มีในสต็อก'),
          buyDate: formatDate(rowCells[5]),
          buyPrice: Number(rowCells[6]) || 0,
          sellDate: formatDate(rowCells[7]),
          sellPrice: Number(rowCells[8]) || 0,
          profit: Number(rowCells[9]) || 0,
          roi: String(rowCells[10] || '0%')
        });
      }
    }

    return respondJson({
      success: true,
      summary: { totalCards, totalCost, totalSales, netProfit },
      cards: cardCollection
    });
  } catch (caughtError) {
    return respondJson({ success: false, message: caughtError.toString() });
  }
}

function doPost(e) {
  try {
    const postBody = JSON.parse(e.postData.contents);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getTargetSheet(spreadsheet);
    const operation = postBody.action || 'add';

    if (operation === 'add') {
      const cardRecord = postBody.card;
      const targetRow = Math.max(sheet.getLastRow() + 1, DATA_START_ROW);
      const profitFormula = `=IF(J${targetRow}>0, J${targetRow}-H${targetRow}, 0)`;
      const roiFormula = `=IF(H${targetRow}>0, TEXT((J${targetRow}-H${targetRow})/H${targetRow}, "0.0%"), "0.0%")`;
      
      let finalImageUrl = '';
      if (cardRecord.imageBase64 && cardRecord.imageBase64.startsWith('data:image')) {
        finalImageUrl = saveImageBlobToDrive(cardRecord.imageBase64);
      }
      if (!finalImageUrl && cardRecord.imageUrl && (cardRecord.imageUrl.startsWith('http://') || cardRecord.imageUrl.startsWith('https://'))) {
        finalImageUrl = cardRecord.imageUrl.trim();
      }

      const imageFormula = finalImageUrl ? `=IMAGE("${finalImageUrl}")` : '';
      const newCardRow = [
        imageFormula,
        cardRecord.cardName || '',
        cardRecord.cardSet || '',
        cardRecord.rarityCondition || '',
        cardRecord.status || 'มีในสต็อก',
        cardRecord.buyDate || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd"),
        Number(cardRecord.buyPrice) || 0,
        cardRecord.sellDate || '',
        Number(cardRecord.sellPrice) || 0,
        profitFormula,
        roiFormula
      ];
      
      sheet.getRange(targetRow, START_COLUMN, 1, NUM_COLUMNS).setValues([newCardRow]);
      return respondJson({ success: true, message: 'บันทึกการ์ดเรียบร้อย', row: targetRow, imageUrl: finalImageUrl });
    }

    if (operation === 'edit') {
      const targetRow = Number(postBody.rowId);
      const cardRecord = postBody.card;
      if (targetRow && targetRow >= DATA_START_ROW && cardRecord) {
        let finalImageUrl = '';
        if (cardRecord.imageBase64 && cardRecord.imageBase64.startsWith('data:image')) {
          finalImageUrl = saveImageBlobToDrive(cardRecord.imageBase64);
        }
        if (!finalImageUrl && cardRecord.imageUrl && (cardRecord.imageUrl.startsWith('http://') || cardRecord.imageUrl.startsWith('https://'))) {
          finalImageUrl = cardRecord.imageUrl.trim();
        }

        if (finalImageUrl) {
          sheet.getRange(targetRow, 2).setValue(`=IMAGE("${finalImageUrl}")`);
        } else if (cardRecord.clearImage) {
          sheet.getRange(targetRow, 2).setValue('');
        }

        if (cardRecord.cardName !== undefined) sheet.getRange(targetRow, 3).setValue(cardRecord.cardName);
        if (cardRecord.cardSet !== undefined) sheet.getRange(targetRow, 4).setValue(cardRecord.cardSet);
        if (cardRecord.rarityCondition !== undefined) sheet.getRange(targetRow, 5).setValue(cardRecord.rarityCondition);
        if (cardRecord.status !== undefined) sheet.getRange(targetRow, 6).setValue(cardRecord.status);
        if (cardRecord.buyDate !== undefined) sheet.getRange(targetRow, 7).setValue(cardRecord.buyDate);
        if (cardRecord.buyPrice !== undefined) sheet.getRange(targetRow, 8).setValue(Number(cardRecord.buyPrice));
        if (cardRecord.sellDate !== undefined) sheet.getRange(targetRow, 9).setValue(cardRecord.sellDate);
        if (cardRecord.sellPrice !== undefined) sheet.getRange(targetRow, 10).setValue(Number(cardRecord.sellPrice));

        return respondJson({ success: true, message: 'แก้ไขข้อมูลการ์ดเรียบร้อย' });
      }
    }

    if (operation === 'delete') {
      const targetRow = Number(postBody.rowId);
      if (targetRow && targetRow >= DATA_START_ROW) {
        sheet.deleteRow(targetRow);
        return respondJson({ success: true, message: 'ลบการ์ดเรียบร้อยแล้ว' });
      }
    }

    if (operation === 'updateStatus') {
      const targetRow = Number(postBody.rowId);
      if (targetRow && targetRow >= DATA_START_ROW) {
        sheet.getRange(targetRow, 6).setValue(postBody.status || 'ขายแล้ว');
        if (postBody.sellDate !== undefined) sheet.getRange(targetRow, 9).setValue(postBody.sellDate);
        if (postBody.sellPrice !== undefined) sheet.getRange(targetRow, 10).setValue(Number(postBody.sellPrice));
        return respondJson({ success: true, message: 'อัปเดตสถานะสำเร็จ' });
      }
    }

    return respondJson({ success: false, message: 'Invalid action' });
  } catch (caughtError) {
    return respondJson({ success: false, message: caughtError.toString() });
  }
}

function getOrCreateImagesFolder() {
  const folderSearch = DriveApp.getFoldersByName('OnePieceCards_Images');
  if (folderSearch.hasNext()) {
    return folderSearch.next();
  }
  const createdFolder = DriveApp.createFolder('OnePieceCards_Images');
  createdFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return createdFolder;
}

function saveImageBlobToDrive(base64Payload) {
  try {
    const encodedSegments = base64Payload.split(',');
    const mimeHeader = encodedSegments[0].split(':')[1].split(';')[0];
    const decodedBytes = Utilities.base64Decode(encodedSegments[1]);
    const fileBlob = Utilities.newBlob(decodedBytes, mimeHeader, `card_${Date.now()}.png`);
    
    const targetFolder = getOrCreateImagesFolder();
    const createdFile = targetFolder.createFile(fileBlob);
    createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return `https://lh3.googleusercontent.com/d/${createdFile.getId()}`;
  } catch (driveError) {
    Logger.log("Drive upload error: " + driveError.toString());
    return '';
  }
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  if (dateValue instanceof Date) return Utilities.formatDate(dateValue, "GMT+7", "yyyy-MM-dd");
  return String(dateValue);
}

function respondJson(outputObject) {
  return ContentService.createTextOutput(JSON.stringify(outputObject))
    .setMimeType(ContentService.MimeType.JSON);
}
