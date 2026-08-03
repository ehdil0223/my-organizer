const $ = (selector) => document.querySelector(selector);
const configured = window.SUPABASE_URL?.startsWith('https://') && !window.SUPABASE_PUBLISHABLE_KEY?.startsWith('YOUR_');
const state = { pending: [], existingFiles: [], editingId: null, records: [] };
let supabase;

if (configured) {
  supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
  startApp();
} else {
  $('#empty-state').textContent = 'Supabase 연결 정보를 먼저 설정해 주세요.';
}

$('#file-input').addEventListener('change', (event) => { state.pending.push(...Array.from(event.target.files)); event.target.value = ''; renderPending(); });
function renderPending() { $('#pending-files').innerHTML = state.pending.map((file, i) => `<span class="file-chip">${escapeHtml(file.name)} <button type="button" data-remove="${i}" aria-label="파일 제거">×</button></span>`).join(''); document.querySelectorAll('[data-remove]').forEach((button) => button.onclick = () => { state.pending.splice(Number(button.dataset.remove), 1); renderPending(); }); }

$('#save-button').onclick = async () => {
  const title = $('#note-title').value.trim() || '제목 없는 기록'; const content = $('#note-content').value.trim();
  if (!content && !state.pending.length) return toast('내용 또는 파일을 추가해 주세요.');
  const old = state.records.find((record) => record.id === state.editingId); const id = state.editingId || crypto.randomUUID();
  $('#save-button').disabled = true; $('#save-button').textContent = '저장 중…';
  try { const newFiles = state.pending.length ? await uploadFiles(id) : []; const files = [...state.existingFiles, ...newFiles]; const payload = { id, title, content, files, updated_at:new Date().toISOString() }; if (!state.editingId) payload.created_at = payload.updated_at;
    const { error } = await supabase.from('records').upsert(payload); if (error) throw error; clearComposer(); toast(old ? '수정했어요.' : '저장했어요.'); await loadRecords();
  } catch { toast('저장에 실패했어요. Supabase 설정을 확인해 주세요.'); } finally { $('#save-button').disabled=false; $('#save-button').textContent='기록 저장'; }
};
async function uploadFiles(recordId) { const uploaded = []; for (const file of state.pending) { const path = `shared/${recordId}/${crypto.randomUUID()}-${file.name}`; const { error } = await supabase.storage.from('record-files').upload(path, file); if (error) throw error; uploaded.push({ name:file.name, path }); } return uploaded; }
async function loadRecords() { const { data, error } = await supabase.from('records').select('*').order('updated_at', { ascending:false }); if (error) return toast('기록을 불러오지 못했어요.'); state.records = data; await render(); }
async function render() { const list=$('#record-list'); list.innerHTML=''; $('#empty-state').hidden=state.records.length>0; $('#record-count').textContent=state.records.length?`${state.records.length}개`:''; for (const record of state.records) { const node=$('#record-template').content.cloneNode(true); node.querySelector('.record-meta').textContent=new Date(record.updated_at).toLocaleString('ko-KR',{dateStyle:'medium',timeStyle:'short'}); node.querySelector('h3').textContent=record.title; node.querySelector('.record-content').textContent=record.content;
  const files=node.querySelector('.attachments'); for (const file of record.files || []) { const { data }=await supabase.storage.from('record-files').createSignedUrl(file.path, 3600); if(data){const link=document.createElement('a');link.className='file-chip';link.href=data.signedUrl;link.target='_blank';link.textContent=`📎 ${file.name}`;files.append(link);} }
  node.querySelector('.edit').onclick=()=>edit(record); node.querySelector('.delete').onclick=()=>remove(record); list.append(node); } }
function edit(record) { state.editingId=record.id; state.pending=[]; state.existingFiles=[...(record.files||[])]; $('#note-title').value=record.title==='제목 없는 기록'?'':record.title; $('#note-content').value=record.content; $('#save-button').textContent='수정 저장'; renderPending(); window.scrollTo({top:0,behavior:'smooth'}); }
async function remove(record) { if(!confirm(`“${record.title}” 기록을 삭제할까요?`)) return; const paths=(record.files||[]).map((file)=>file.path); if(paths.length) await supabase.storage.from('record-files').remove(paths); const { error }=await supabase.from('records').delete().eq('id',record.id); if(error) return toast('삭제하지 못했어요.'); await loadRecords(); toast('삭제했어요.'); }
function clearComposer() { state.pending=[]; state.existingFiles=[]; state.editingId=null; $('#note-title').value=''; $('#note-content').value=''; $('#save-button').textContent='기록 저장'; renderPending(); }
function escapeHtml(text) { const e=document.createElement('span');e.textContent=text;return e.innerHTML; } let timer; function toast(message){const e=$('#toast');e.textContent=message;e.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>e.classList.remove('show'),2200);}
async function startApp() { await loadRecords(); supabase.channel('shared-records').on('postgres_changes',{event:'*',schema:'public',table:'records'},loadRecords).subscribe(); }
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
