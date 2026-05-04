const SHEET_NAME = 'PR_Requests';

function doGet(e) {
  return jsonOutput({ ok: true, data: getAllPRs() });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const action = payload.action;

    if (action === 'saveAll') {
      saveAllPRs(payload.data || []);
      return jsonOutput({ ok: true, data: getAllPRs() });
    }

    if (action === 'upsert') {
      upsertPR(payload.pr);
      return jsonOutput({ ok: true, data: getAllPRs() });
    }

    if (action === 'clear') {
      saveAllPRs([]);
      return jsonOutput({ ok: true, data: [] });
    }

    return jsonOutput({ ok: false, error: 'Unknown action' });
  } catch (error) {
    return jsonOutput({ ok: false, error: String(error) });
  }
}

function setup() {
  const sheet = getSheet();
  sheet.clear();
  sheet.appendRow(headers());
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers().length);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers());
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function headers() {
  return [
    'id', 'no', 'requester', 'department', 'vendor', 'item', 'amount',
    'reason', 'nextApprover', 'status', 'createdAt', 'logsJson', 'updatedAt'
  ];
}

function getAllPRs() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const head = values[0];
  return values.slice(1).filter(row => row[0]).map(row => {
    const obj = {};
    head.forEach((key, index) => obj[key] = row[index]);
    obj.amount = Number(obj.amount || 0);
    try {
      obj.logs = JSON.parse(obj.logsJson || '[]');
    } catch (error) {
      obj.logs = [];
    }
    delete obj.logsJson;
    return obj;
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function saveAllPRs(data) {
  const sheet = getSheet();
  sheet.clear();
  sheet.appendRow(headers());
  if (!Array.isArray(data) || data.length === 0) return;
  const rows = data.map(toRow);
  sheet.getRange(2, 1, rows.length, headers().length).setValues(rows);
  sheet.autoResizeColumns(1, headers().length);
}

function upsertPR(pr) {
  if (!pr || !pr.id) throw new Error('Missing PR id');
  const data = getAllPRs();
  const index = data.findIndex(item => item.id === pr.id);
  if (index >= 0) data[index] = pr;
  else data.unshift(pr);
  saveAllPRs(data);
}

function toRow(pr) {
  return [
    pr.id || Utilities.getUuid(),
    pr.no || '',
    pr.requester || '',
    pr.department || '',
    pr.vendor || '',
    pr.item || '',
    Number(pr.amount || 0),
    pr.reason || '',
    pr.nextApprover || '',
    pr.status || '',
    pr.createdAt || '',
    JSON.stringify(pr.logs || []),
    new Date().toISOString()
  ];
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
