const $ = (selector) => document.querySelector(selector);
const state = { pending: [], editingId: null, db: null };
const dbRequest = indexedDB.open('personal-organizer', 1);
dbRequest.onupgradeneeded = (event) => {
  const db = event.target.result;
  db.createObjectStore('records', { keyPath: 'id' });
};
dbRequest.onsuccess = async (event) => { state.db = event.target.result; await render(); };
dbRequest.onerror = () => toast('저장 공간을 열 수 없어요.');

function request(store, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(store, mode);
    const req = action(tx.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const getRecords = () => request('records', 'readonly', (s) => s.getAll());
const putRecord = (record) => request('records', 'readwrite', (s) => s.put(record));
const deleteRecord = (id) => request('records', 'readwrite', (s) => s.delete(id));

$('#file-input').addEventListener('change', (event) => {
  state.pending.push(...Array.from(event.target.files)); event.target.value = ''; renderPending();
});
function renderPending() {
  $('#pending-files').innerHTML = state.pending.map((file, index) => `<span class="file-chip">${escapeHtml(file.name)} <button type="button" data-remove="${index}" aria-label="${escapeHtml(file.name)} 제거">×</button></span>`).join('');
  document.querySelectorAll('[data-remove]').forEach((button) => button.onclick = () => { state.pending.splice(Number(button.dataset.remove), 1); renderPending(); });
}
$('#save-button').onclick = async () => {
  const title = $('#note-title').value.trim(); const content = $('#note-content').value.trim();
  if (!title && !content && !state.pending.length) return toast('내용 또는 파일을 추가해 주세요.');
  const old = state.editingId ? (await getRecords()).find((r) => r.id === state.editingId) : null;
  const isEditing = Boolean(state.editingId);
  await putRecord({ id: state.editingId || crypto.randomUUID(), title: title || '제목 없는 기록', content, files: state.pending.length ? state.pending : (old?.files || []), createdAt: old?.createdAt || Date.now(), updatedAt: Date.now() });
  clearComposer(); await render(); toast(isEditing ? '수정했어요.' : '저장했어요.');
};
function clearComposer() { state.pending=[]; state.editingId=null; $('#note-title').value=''; $('#note-content').value=''; $('#save-button').textContent='기록 저장'; renderPending(); }
async function render() {
  const records = (await getRecords()).sort((a,b) => b.updatedAt-a.updatedAt); const list = $('#record-list'); list.innerHTML=''; $('#empty-state').hidden=records.length>0; $('#record-count').textContent=records.length ? `${records.length}개` : '';
  records.forEach((record) => { const node = $('#record-template').content.cloneNode(true); const article=node.querySelector('article'); node.querySelector('.record-meta').textContent = new Date(record.updatedAt).toLocaleString('ko-KR', { dateStyle:'medium', timeStyle:'short' }); node.querySelector('h3').textContent=record.title; node.querySelector('.record-content').textContent=record.content;
    const files=node.querySelector('.attachments'); (record.files || []).forEach((file) => { const link=document.createElement('a'); link.className='file-chip'; link.href=URL.createObjectURL(file); link.download=file.name; link.textContent=`📎 ${file.name}`; files.append(link); });
    node.querySelector('.edit').onclick=()=>edit(record); node.querySelector('.delete').onclick=async()=>{ if(confirm(`“${record.title}” 기록을 삭제할까요?`)){await deleteRecord(record.id); await render(); toast('삭제했어요.');} }; list.append(node); });
}
function edit(record) { state.editingId=record.id; state.pending=[...(record.files||[])]; $('#note-title').value=record.title==='제목 없는 기록'?'':record.title; $('#note-content').value=record.content; $('#save-button').textContent='수정 저장'; renderPending(); window.scrollTo({top:0,behavior:'smooth'}); }
function escapeHtml(text) { const element=document.createElement('span'); element.textContent=text; return element.innerHTML; }
let timer; function toast(message) { const element=$('#toast'); element.textContent=message; element.classList.add('show'); clearTimeout(timer); timer=setTimeout(()=>element.classList.remove('show'),2200); }
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
