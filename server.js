const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'bukti.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'bksosmed-final-secret';
const ADMIN_USER = process.env.ADMIN_USER || process.env.ADMIN_ID || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD || '12345';

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}
ensureDataFile();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }));
app.use(bodyParser.json({ limit: '2mb' }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 12 }
}));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

function readData() {
  ensureDataFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[DATA] Gagal baca JSON:', err.message);
    return [];
  }
}
function writeData(data) {
  ensureDataFile();
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}
function slugify(input) {
  return String(input || 'post')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `post-${Date.now()}`;
}
function uniqueSlug(base, currentId) {
  const data = readData();
  let slug = slugify(base);
  let n = 2;
  while (data.some(p => p.id === slug && p.id !== currentId)) slug = `${slugify(base)}-${n++}`;
  return slug;
}
function publicPosts(q) {
  let data = readData().filter(p => p.published !== false);
  if (q) {
    const needle = String(q).toLowerCase();
    data = data.filter(p => `${p.title || ''} ${p.excerpt || ''}`.toLowerCase().includes(needle));
  }
  return data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}
function adminOnly(req, res, next) {
  if (!req.session.user) return res.redirect('/admin/login');
  next();
}
function apiAdminOnly(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'unauthorized' });
  next();
}

app.get('/', (req, res) => {
  res.render('index', { posts: publicPosts(req.query.q), q: req.query.q || '' });
});
app.get('/detail/:id', (req, res) => {
  const posts = publicPosts();
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).render('404');
  res.render('detail', { post, related: posts.filter(p => p.id !== post.id).slice(0, 6) });
});
app.get('/detail.html', (req, res) => {
  const id = req.query.id;
  if (!id) return res.redirect('/');
  res.redirect(301, `/detail/${encodeURIComponent(id)}`);
});
app.get('/index.html', (req, res) => res.redirect(301, '/'));

app.get('/admin', (req, res) => res.redirect('/admin/dashboard'));
app.get('/admin/login', (req, res) => {
  if (req.session.user) return res.redirect('/admin/dashboard');
  res.render('admin/login', { error: req.query.error || '' });
});
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.user = username;
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/admin/login?error=1');
});
app.post('/admin/logout', (req, res) => req.session.destroy(() => res.redirect('/admin/login')));
app.get('/admin/dashboard', adminOnly, (req, res) => {
  res.render('admin/dashboard', { posts: readData().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)), user: req.session.user });
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'unauth' });
  res.json({ username: req.session.user });
});
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.user = username;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'invalid' });
});
app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/bukti', (req, res) => {
  const data = req.session.user ? readData() : publicPosts(req.query.q);
  const q = req.query.q;
  if (!q || !req.session.user) return res.json(data);
  const needle = String(q).toLowerCase();
  res.json(data.filter(p => `${p.title || ''} ${p.excerpt || ''}`.toLowerCase().includes(needle)));
});
app.get('/api/bukti/:id', (req, res) => {
  const data = req.session.user ? readData() : publicPosts();
  const post = data.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'not found' });
  res.json(post);
});
app.post('/api/bukti', apiAdminOnly, (req, res) => {
  const data = readData();
  const body = req.body || {};
  const title = String(body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uniqueSlug(body.id || title);
  const now = new Date().toISOString();
  const post = {
    id,
    title,
    thumb: String(body.thumb || body.image || '').trim(),
    image: String(body.thumb || body.image || '').trim(),
    excerpt: String(body.excerpt || '').trim() || title.slice(0, 120),
    contentHtml: String(body.contentHtml || '').trim(),
    date: now,
    published: body.published === undefined ? true : !!body.published
  };
  data.unshift(post);
  writeData(data);
  res.json(post);
});
app.put('/api/bukti/:id', apiAdminOnly, (req, res) => {
  const data = readData();
  const idx = data.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  const body = req.body || {};
  const title = String(body.title ?? data[idx].title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title required' });
  const newId = body.id && body.id !== req.params.id ? uniqueSlug(body.id, req.params.id) : req.params.id;
  data[idx] = {
    ...data[idx],
    id: newId,
    title,
    thumb: String(body.thumb ?? body.image ?? data[idx].thumb ?? '').trim(),
    image: String(body.thumb ?? body.image ?? data[idx].image ?? '').trim(),
    excerpt: String(body.excerpt ?? data[idx].excerpt ?? '').trim(),
    contentHtml: String(body.contentHtml ?? data[idx].contentHtml ?? '').trim(),
    date: new Date().toISOString()
  };
  writeData(data);
  res.json(data[idx]);
});
app.patch('/api/bukti/:id/publish', apiAdminOnly, (req, res) => {
  const data = readData();
  const idx = data.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  data[idx].published = !!req.body.published;
  data[idx].date = new Date().toISOString();
  writeData(data);
  res.json(data[idx]);
});
app.delete('/api/bukti/:id', apiAdminOnly, (req, res) => {
  const data = readData();
  const next = data.filter(p => p.id !== req.params.id);
  if (next.length === data.length) return res.status(404).json({ error: 'not found' });
  writeData(next);
  res.json({ ok: true });
});

app.use((req, res) => res.status(404).render('404'));
app.listen(PORT, () => console.log(`BKSOSMED EJS running on port ${PORT}`));
