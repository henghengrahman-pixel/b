const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const FileStoreFactory = require('session-file-store');

const app = express();
const FileStore = FileStoreFactory(session);

const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'bukti.json');
const SESSION_DIR = path.join(DATA_DIR, 'sessions');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '12345';
const SESSION_SECRET = process.env.SESSION_SECRET || 'merdeka-secret';

function ensureDir(dir){
  if(!fs.existsSync(dir)){
    fs.mkdirSync(dir,{recursive:true});
  }
}

ensureDir(DATA_DIR);
ensureDir(SESSION_DIR);

if(!fs.existsSync(DATA_FILE)){
  fs.writeFileSync(DATA_FILE,'[]','utf8');
}

app.set('trust proxy',1);
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));

app.use(bodyParser.json({limit:'10mb'}));
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  name:'bukti_sid',
  secret:SESSION_SECRET,
  store:new FileStore({
    path:SESSION_DIR,
    ttl:86400
  }),
  resave:false,
  saveUninitialized:false,
  cookie:{
    secure:false,
    sameSite:'lax',
    httpOnly:true,
    maxAge:1000*60*60*24
  }
}));

app.use('/css',express.static(path.join(__dirname,'public/css')));
app.use('/js',express.static(path.join(__dirname,'public/js')));
app.use('/admin/js',express.static(path.join(__dirname,'admin/js')));
app.use('/admin/css',express.static(path.join(__dirname,'admin/css')));

function readData(){
  try{
    return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
  }catch{
    return [];
  }
}

function writeData(data){
  fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2));
}

function requireLogin(req,res,next){
  if(!req.session.user){
    return res.redirect('/admin/login');
  }
  next();
}

app.get('/',(req,res)=>{
  res.render('pages/index',{
    title:'Bukti JP',
    posts:readData(),
    q:req.query.q || ''
  });
});

app.get('/bukti/:id',(req,res)=>{
  const item = readData().find(x=>x.id===req.params.id);

  if(!item){
    return res.status(404).render('pages/404',{
      title:'404'
    });
  }

  res.render('pages/detail',{
    title:item.title,
    item
  });
});

app.get('/admin/login',(req,res)=>{
  res.render('admin/login',{
    title:'Login Admin'
  });
});

app.get('/admin/dashboard',requireLogin,(req,res)=>{
  res.render('admin/dashboard',{
    title:'Dashboard',
    username:req.session.user,
    posts:readData()
  });
});

app.post('/api/login',(req,res)=>{

  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '').trim();

  if(
    username !== ADMIN_USER ||
    password !== ADMIN_PASS
  ){
    return res.status(401).json({
      error:'Username atau password salah'
    });
  }

  req.session.user = ADMIN_USER;

  req.session.save(err=>{

    if(err){
      return res.status(500).json({
        error:'Session gagal'
      });
    }

    return res.json({
      ok:true
    });

  });

});

app.post('/api/logout',(req,res)=>{
  req.session.destroy(()=>{
    res.json({ok:true});
  });
});

app.post('/api/bukti',requireLogin,(req,res)=>{

  const posts = readData();

  const item = {
    id:Date.now().toString(),
    title:req.body.title || '',
    image:req.body.image || '',
    excerpt:req.body.excerpt || '',
    contentHtml:req.body.contentHtml || '',
    date:new Date().toISOString()
  };

  posts.unshift(item);

  writeData(posts);

  res.json({
    ok:true
  });

});

app.use((req,res)=>{
  res.status(404).render('pages/404',{
    title:'404'
  });
});

app.listen(PORT,()=>{
  console.log(`SERVER RUNNING PORT ${PORT}`);
});
