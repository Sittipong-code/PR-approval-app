const STORAGE_KEY = 'pr-approval-app-v1';
const API_KEY = 'pr-approval-api-url';
const STATUS = {
  SUBMITTED: 'Submitted',
  MANAGER: 'Waiting Manager Approval',
  FINANCE: 'Waiting Finance Approval',
  PARTNER: 'Waiting Partner Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed'
};

const $ = (selector) => document.querySelector(selector);
const money = (value) => Number(value || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB' });
const now = () => new Date().toLocaleString('th-TH');
const apiUrl = () => localStorage.getItem(API_KEY) || '';

function loadData(){ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function saveLocal(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); render(); }
async function saveData(data){ saveLocal(data); if(apiUrl()) await saveCloud(data); }
async function saveCloud(data){ await postApi({ action:'saveAll', data }); }
async function postApi(payload){
  const url = apiUrl();
  if(!url) throw new Error('ยังไม่ได้ตั้งค่า API URL');
  const res = await fetch(url, { method:'POST', body: JSON.stringify(payload) });
  const json = await res.json();
  if(!json.ok) throw new Error(json.error || 'API error');
  return json;
}
async function syncFromCloud(){
  if(!apiUrl()) return alert('ยังไม่ได้ตั้งค่า API URL');
  try{
    setConnection('กำลัง Sync จาก Google Sheet...', 'pending');
    const res = await fetch(apiUrl());
    const json = await res.json();
    if(!json.ok) throw new Error(json.error || 'API error');
    saveLocal(json.data || []);
    setConnection('เชื่อมต่อ Google Sheet แล้ว ข้อมูลนี้ใช้ร่วมกันได้', 'ok');
  } catch(error){ setConnection('Sync ไม่สำเร็จ: ' + error.message, 'bad'); }
}
function setConnection(text, type=''){
  $('#connectionStatus').innerHTML = `<div class="connection-box ${type}">${escapeHtml(text)}</div>`;
}
function showConnection(){
  if(apiUrl()) setConnection('โหมดฐานข้อมูลกลาง: เชื่อมกับ Google Sheet แล้ว', 'ok');
  else setConnection('โหมดทดลอง: ข้อมูลอยู่ใน browser นี้เท่านั้น กด “ตั้งค่า API URL” เพื่อให้หุ้นส่วนเห็นข้อมูลเดียวกัน', 'pending');
}
function setApiUrl(){
  const current = apiUrl();
  const value = prompt('วาง Google Apps Script Web App URL ที่นี่', current);
  if(value === null) return;
  localStorage.setItem(API_KEY, value.trim());
  showConnection();
  if(value.trim()) syncFromCloud();
}
function nextPrNo(){
  const year = new Date().getFullYear();
  const count = loadData().filter(pr => pr.no.includes(`PR-${year}`)).length + 1;
  return `PR-${year}-${String(count).padStart(4,'0')}`;
}
function autoStatus(amount, approver){
  if(Number(amount) >= 50000) return STATUS.PARTNER;
  if(approver === 'Finance') return STATUS.FINANCE;
  return STATUS.MANAGER;
}
function badgeClass(status){
  if(status === STATUS.APPROVED) return 'approved';
  if(status === STATUS.REJECTED) return 'rejected';
  if(status === STATUS.CLOSED) return 'closed';
  if(status.includes('Waiting')) return 'waiting';
  return '';
}
function createLog(action, actor='System', note=''){ return { at: now(), action, actor, note }; }

$('#prForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const amount = Number(form.get('amount'));
  const pr = {
    id: crypto.randomUUID(), no: nextPrNo(), requester: form.get('requester').trim(),
    department: form.get('department').trim(), vendor: form.get('vendor').trim() || '-',
    item: form.get('item').trim(), amount, reason: form.get('reason').trim() || '-',
    nextApprover: form.get('nextApprover'), status: autoStatus(amount, form.get('nextApprover')),
    createdAt: now(), logs: [createLog('Created PR', form.get('requester'), 'ส่งเอกสารเข้าสู่ workflow')]
  };
  await saveData([pr, ...loadData()]);
  event.target.reset();
});

$('#searchInput').addEventListener('input', render);
$('#seedBtn').addEventListener('click', seedData);
$('#syncBtn').addEventListener('click', syncFromCloud);
$('#apiBtn').addEventListener('click', setApiUrl);
$('#clearBtn').addEventListener('click', async () => {
  if(confirm('ล้างข้อมูลทั้งหมด? ถ้าเชื่อม Google Sheet อยู่ จะล้างฐานข้อมูลกลางด้วย')) {
    saveLocal([]);
    if(apiUrl()) await postApi({action:'clear'});
  }
});
$('#exportBtn').addEventListener('click', exportCSV);
$('#closeDialog').addEventListener('click', () => $('#detailDialog').close());

async function act(id, action){
  const data = loadData();
  const pr = data.find(item => item.id === id);
  if(!pr) return;
  const actor = prompt('ชื่อผู้ดำเนินการ', pr.nextApprover || 'Approver') || 'Approver';
  const note = prompt('หมายเหตุ', '') || '';
  if(action === 'approve') {
    if(pr.status === STATUS.MANAGER) pr.status = Number(pr.amount) >= 50000 ? STATUS.PARTNER : STATUS.FINANCE;
    else if(pr.status === STATUS.FINANCE) pr.status = Number(pr.amount) >= 50000 ? STATUS.PARTNER : STATUS.APPROVED;
    else if(pr.status === STATUS.PARTNER) pr.status = STATUS.APPROVED;
    else pr.status = STATUS.APPROVED;
    pr.logs.push(createLog('Approved / Moved next step', actor, note));
  }
  if(action === 'reject') { pr.status = STATUS.REJECTED; pr.logs.push(createLog('Rejected', actor, note)); }
  if(action === 'close') { pr.status = STATUS.CLOSED; pr.logs.push(createLog('Closed after purchase', actor, note)); }
  if(action === 'reset') { pr.status = autoStatus(pr.amount, pr.nextApprover); pr.logs.push(createLog('Reset workflow', actor, note)); }
  await saveData(data);
}

function showDetail(id){
  const pr = loadData().find(item => item.id === id);
  if(!pr) return;
  $('#modalTitle').textContent = `${pr.no} · ${pr.status}`;
  $('#modalBody').innerHTML = `<p><b>ผู้ขอ:</b> ${escapeHtml(pr.requester)} · <b>แผนก:</b> ${escapeHtml(pr.department)}</p><p><b>Vendor:</b> ${escapeHtml(pr.vendor)} · <b>ยอดเงิน:</b> ${money(pr.amount)}</p><p><b>รายการ:</b><br>${escapeHtml(pr.item)}</p><p><b>เหตุผล:</b><br>${escapeHtml(pr.reason)}</p><h3>ประวัติเอกสาร</h3><div class="timeline">${pr.logs.map(log => `<div class="log"><b>${escapeHtml(log.action)}</b><div class="small">${escapeHtml(log.at)} · ${escapeHtml(log.actor)}</div><div>${escapeHtml(log.note)}</div></div>`).join('')}</div>`;
  $('#detailDialog').showModal();
}

function renderStats(data){
  const total = data.length, waiting = data.filter(pr => pr.status.includes('Waiting') || pr.status === STATUS.SUBMITTED).length;
  const approved = data.filter(pr => pr.status === STATUS.APPROVED).length, rejected = data.filter(pr => pr.status === STATUS.REJECTED).length;
  const value = data.reduce((sum, pr) => sum + Number(pr.amount || 0), 0);
  $('#stats').innerHTML = [['ทั้งหมด', total],['รออนุมัติ', waiting],['อนุมัติแล้ว', approved],['ไม่อนุมัติ', rejected],['มูลค่ารวม', money(value)]].map(([label, val]) => `<div class="stat"><b>${val}</b><span>${label}</span></div>`).join('');
}
function render(){
  const query = $('#searchInput').value.toLowerCase().trim();
  const data = loadData(); renderStats(data);
  const filtered = data.filter(pr => JSON.stringify(pr).toLowerCase().includes(query));
  $('#prList').innerHTML = filtered.length ? filtered.map(pr => `<article class="pr"><div class="pr-top"><div><h3>${escapeHtml(pr.no)}</h3><div class="meta"><span>${escapeHtml(pr.requester)}</span><span>·</span><span>${escapeHtml(pr.department)}</span><span>·</span><span>${escapeHtml(pr.vendor)}</span></div></div><span class="pill ${badgeClass(pr.status)}">${escapeHtml(pr.status)}</span></div><div>${escapeHtml(pr.item)}</div><div class="amount">${money(pr.amount)}</div><div class="actions"><button class="ghost" onclick="showDetail('${pr.id}')">ดูรายละเอียด</button><button class="secondary" onclick="act('${pr.id}','approve')">อนุมัติ/ขั้นถัดไป</button><button class="danger" onclick="act('${pr.id}','reject')">ไม่อนุมัติ</button><button class="ghost" onclick="act('${pr.id}','close')">ปิดงาน</button><button class="ghost" onclick="act('${pr.id}','reset')">เริ่ม workflow ใหม่</button></div></article>`).join('') : '<div class="empty">ยังไม่มีเอกสาร PR หรือไม่พบผลการค้นหา</div>';
}
async function seedData(){
  const sample = [
    {requester:'คุณตังค์',department:'คลินิก',vendor:'ABC Medical',item:'หัวทรีตเมนต์และ consumables สำหรับเครื่อง aesthetic',amount:28500,reason:'ใช้เติม stock สำหรับเคสลูกค้าสัปดาห์นี้',nextApprover:'Manager'},
    {requester:'Finance Team',department:'บัญชี',vendor:'Office Supply Co.',item:'กระดาษ หมึกพิมพ์ และอุปกรณ์สำนักงาน',amount:7600,reason:'ของใช้ประจำเดือน',nextApprover:'Finance'},
    {requester:'Sales Team',department:'ขาย',vendor:'Event Organizer',item:'บูธงานประชุมความงามและสื่อประชาสัมพันธ์',amount:85000,reason:'กิจกรรมสร้าง lead และ dealer network',nextApprover:'Partner 1'}
  ].map((item, index) => ({id: crypto.randomUUID(), no: `PR-${new Date().getFullYear()}-${String(index+1).padStart(4,'0')}`,...item, status: autoStatus(item.amount, item.nextApprover), createdAt: now(), logs: [createLog('Created sample PR', item.requester, 'ข้อมูลตัวอย่างสำหรับทดลองระบบ')]}));
  await saveData(sample);
}
function exportCSV(){
  const data = loadData();
  const rows = [['PR No','Status','Requester','Department','Vendor','Item','Amount','Reason','Created At']];
  data.forEach(pr => rows.push([pr.no,pr.status,pr.requester,pr.department,pr.vendor,pr.item,pr.amount,pr.reason,pr.createdAt]));
  const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `pr-export-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
}
function escapeHtml(value){ return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
showConnection(); render(); if(apiUrl()) syncFromCloud();
