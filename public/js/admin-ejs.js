const TZ = 'Asia/Jakarta';
const wib = value => new Date(value || Date.now()).toLocaleString('id-ID', { timeZone: TZ, hour12: false });
function fmt(el, cmd){ document.execCommand(cmd, false, null); el.blur(); }
function insertHtml(el, html){ const ed = el.closest('.post-card').querySelector('.editor'); ed.focus(); document.execCommand('insertHTML', false, html); }
async function req(url, options){
  const res = await fetch(url, options);
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}
function renumber(){
  document.querySelectorAll('#cards .post-card').forEach((card, i) => {
    const n = i + 1;
    card.querySelector('.badge').textContent = `Bukti JP #${n}`;
    card.querySelector('.pub-btn').textContent = `Publikasikan #${n}`;
    card.querySelector('.hide-btn').textContent = `Sembunyikan #${n}`;
    card.querySelector('.del-btn').textContent = `Hapus #${n}`;
  });
}
function cardFromData(data = {}){
  const node = document.getElementById('card-tpl').content.firstElementChild.cloneNode(true);
  bind(node, data);
  return node;
}
function bind(card, data){
  card.dataset.id = data.id || '';
  const title = card.querySelector('.title');
  const thumb = card.querySelector('.thumb');
  const excerpt = card.querySelector('.excerpt');
  const editor = card.querySelector('.editor');
  const update = card.querySelector('.update');
  const preview = card.querySelector('.preview');
  const pub = card.querySelector('.pub-btn');
  const hide = card.querySelector('.hide-btn');
  const del = card.querySelector('.del-btn');
  const save = card.querySelector('.save-btn');
  title.value = data.title || '';
  thumb.value = data.thumb || data.image || '';
  excerpt.value = data.excerpt || '';
  editor.innerHTML = data.contentHtml || '';
  update.textContent = `Update pada : ${wib(data.date)} WIB`;
  function refreshPreview(){
    const url = thumb.value.trim();
    preview.src = url;
    preview.style.display = url ? 'block' : 'none';
  }
  function refreshStatus(){
    const isPublished = data.published !== false;
    pub.style.display = isPublished ? 'none' : 'inline-flex';
    hide.style.display = isPublished ? 'inline-flex' : 'none';
  }
  function touch(){ update.textContent = `Update pada : ${wib()} WIB`; }
  [title, thumb, excerpt, editor].forEach(el => el.addEventListener('input', touch));
  thumb.addEventListener('input', refreshPreview);
  refreshPreview(); refreshStatus();
  save.addEventListener('click', async () => {
    const payload = { id: card.dataset.id || undefined, title: title.value.trim(), thumb: thumb.value.trim(), excerpt: excerpt.value.trim(), contentHtml: editor.innerHTML.trim() };
    if(!payload.title) return alert('Judul wajib diisi.');
    try{
      const saved = await req(card.dataset.id ? `/api/bukti/${encodeURIComponent(card.dataset.id)}` : '/api/bukti', {
        method: card.dataset.id ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      data = saved; card.dataset.id = saved.id; alert('Tersimpan'); refreshStatus(); touch();
    }catch(e){ alert('Gagal simpan.'); }
  });
  pub.addEventListener('click', async () => {
    if(!card.dataset.id) return alert('Simpan dulu sebelum publish.');
    try{ data = await req(`/api/bukti/${encodeURIComponent(card.dataset.id)}/publish`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({published:true}) }); refreshStatus(); }
    catch(e){ alert('Gagal publish.'); }
  });
  hide.addEventListener('click', async () => {
    if(!card.dataset.id) return alert('Simpan dulu sebelum sembunyikan.');
    try{ data = await req(`/api/bukti/${encodeURIComponent(card.dataset.id)}/publish`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({published:false}) }); refreshStatus(); }
    catch(e){ alert('Gagal sembunyikan.'); }
  });
  del.addEventListener('click', async () => {
    if(!confirm('Hapus Bukti JP ini?')) return;
    if(card.dataset.id){
      try{ await req(`/api/bukti/${encodeURIComponent(card.dataset.id)}`, { method:'DELETE' }); }
      catch(e){ return alert('Gagal hapus.'); }
    }
    card.remove(); renumber();
  });
}
function addCard(){ document.getElementById('cards').prepend(cardFromData({ published: true })); renumber(); }
window.addCard = addCard; window.fmt = fmt; window.insertHtml = insertHtml;
(function init(){
  const root = document.getElementById('cards');
  const data = Array.isArray(window.__INITIAL_POSTS__) ? window.__INITIAL_POSTS__ : [];
  if(!data.length) addCard(); else data.forEach(p => root.append(cardFromData(p)));
  renumber();
})();
