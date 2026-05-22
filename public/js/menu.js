(function(){
  const fab = document.getElementById('mcFab');
  const sheet = document.getElementById('mcSheet');
  const close = document.getElementById('mcClose');
  if(!fab || !sheet) return;
  function setOpen(open){
    sheet.classList.toggle('open', open);
    fab.setAttribute('aria-expanded', String(open));
    sheet.setAttribute('aria-hidden', String(!open));
  }
  fab.addEventListener('click', () => setOpen(!sheet.classList.contains('open')));
  close && close.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => { if(e.key === 'Escape') setOpen(false); });
})();
