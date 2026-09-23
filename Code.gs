/**
 * One Piece Card Tracker API Backend
 */
const SHEET_NAME = 'Sheet1'; // หรือชื่อแท็บที่ใช้งาน
const DATA_START_ROW = 8;   // ปรับเป็นแถวที่ 8 (เพราะแถวที่ 7 คือหัวตารางภาษาไทย)

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
    const lastRow = sheet.getLastRow();
    
    // ดึงค่าสรุป KPI ด้านบน (แถวที่ 4)
    const totalCards = sheet.getRange("B4").getValue() || sheet.getRange("A4").getValue() || 0;
    const totalCost = sheet.getRange("D4").getValue() || sheet.getRange("C4").getValue() || 0;
    const totalSales = sheet.getRange("F4").getValue() || sheet.getRange("E4").getValue() || 0;
    const netProfit = sheet.getRange("H4").getValue() || sheet.getRange("G4").getValue() || 0;
    
    const cards = [];
    if (lastRow >= DATA_START_ROW) {
      const data = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 11).getValues();
      const formulas = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 1).getFormulas();
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row[1]) continue; // ถ้าไม่มีชื่อการ์ดให้ข้าม
        
        let img = String(row[0] || '');
        if (!img && formulas[i] && formulas[i][0]) {
          const m = formulas[i][0].match(/=IMAGE\("([^"]+)"\)/i);
          if (m) img = m[1];
        }
        
        cards.push({
          rowId: DATA_START_ROW + i,
          imageUrl: img,
          cardName: String(row[1] || ''),
          cardSet: String(row[2] || ''),
          rarityCondition: String(row[3] || ''),
          status: String(row[4] || 'มีในสต็อก'),
          buyDate: formatDate(row[5]),
          buyPrice: Number(row[6]) || 0,
          sellDate: formatDate(row[7]),
          sellPrice: Number(row[8]) || 0,
          profit: Number(row[9]) || 0,
          roi: String(row[10] || '0%')
        });
      }
    }

    return responseJSON({
      success: true,
      summary: { totalCards, totalCost, totalSales, netProfit },
      cards: cards
    });
  } catch (error) {
    return responseJSON({ success: false, message: error.toString() });
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
    
    const action = postData.action || 'add';

    if (action === 'add') {
      const c = postData.card;
      const targetRow = Math.max(sheet.getLastRow() + 1, DATA_START_ROW);
      const profitFormula = `=IF(I${targetRow}>0, I${targetRow}-G${targetRow}, 0)`;
      const roiFormula = `=IF(G${targetRow}>0, TEXT((I${targetRow}-G${targetRow})/G${targetRow}, "0.0%"), "0.0%")`;
      
      let finalImageUrl = c.imageUrl || '';
      
      // ถ้ารูปส่งมาเป็น Base64 (วางจากคลิปบอร์ด หรืออัปโหลดไฟล์) ให้อัปโหลดเข้า Google Drive อัตโนมัติ
      if (c.imageBase64 && c.imageBase64.startsWith('data:image')) {
        try {
          const parts = c.imageBase64.split(',');
          const contentType = parts[0].split(':')[1].split(';')[0];
          const decoded = Utilities.base64Decode(parts[1]);
          const blob = Utilities.newBlob(decoded, contentType, `card_${Date.now()}.png`);
          
          // หาโฟลเดอร์สำหรับเก็บภาพการ์ด (ถ้าไม่มีจะสร้างให้อัตโนมัติ)
          let folder;
          const folderIter = DriveApp.getFoldersByName('OnePieceCards_Images');
          if (folderIter.hasNext()) {
            folder = folderIter.next();
          } else {
            folder = DriveApp.createFolder('OnePieceCards_Images');
            folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          }
          
          const file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          finalImageUrl = `https://lh3.googleusercontent.com/d/${file.getId()}`;
        } catch (imgErr) {
          finalImageUrl = c.imageUrl || '';
        }
      }

      // ในช่องรูปภาพ ถ้ามี URL ให้ใส่สูตร =IMAGE(...) ลงชีตให้แสดงภาพทันที
      const imageCell = finalImageUrl ? `=IMAGE("${finalImageUrl}")` : '';

      const newRow = [
        imageCell,
        c.cardName || '',
        c.cardSet || '',
        c.rarityCondition || '',
        c.status || 'มีในสต็อก',
        c.buyDate || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd"),
        c.buyPrice || 0,
        c.sellDate || '',
        c.sellPrice || 0,
        profitFormula,
        roiFormula
      ];
      
      sheet.appendRow(newRow);
      return responseJSON({ success: true, message: 'บันทึกการ์ดเรียบร้อย', row: targetRow, imageUrl: finalImageUrl });
    }

    if (action === 'updateStatus') {
      const row = postData.rowId;
      if (row) {
        sheet.getRange(row, 5).setValue(postData.status || 'ขายแล้ว');
        if (postData.sellPrice) sheet.getRange(row, 9).setValue(postData.sellPrice);
        if (postData.sellDate) sheet.getRange(row, 8).setValue(postData.sellDate);
        return responseJSON({ success: true, message: 'อัปเดตสถานะสำเร็จ' });
      }
    }

    return responseJSON({ success: false, message: 'Invalid action' });
  } catch (error) {
    return responseJSON({ success: false, message: error.toString() });
  }
}

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) return Utilities.formatDate(val, "GMT+7", "yyyy-MM-dd");
  return String(val);
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
