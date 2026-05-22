const express=require('express');
const path=require('path');
const fs=require('fs');
const bodyParser=require('body-parser');
const session=require('express-session');
const methodOverride=require('method-override');

const app=express();

const DATA_DIR=process.env.DATA_DIR || path.join(__dirname,'data');
const DATA_FILE=path.join(DATA_DIR,'bukti.json');

if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true});
if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE,'[]');

app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));

app.use(express.static(path.join(__dirname,'public')));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(methodOverride('_method'));

app.use(session({
secret:process.env.SESSION_SECRET || 'secret123',
resave:false,
saveUninitialized:false
}));

function db(){
return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'[]');
}

function save(data){
fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2));
}

function auth(req,res,next){
if(!req.session.login) return res.redirect('/admin');
next();
}

app.get('/',(req,res)=>{
res.render('pages/index',{posts:db().filter(x=>x.published!==false)});
});

app.get('/detail/:id',(req,res)=>{
const post=db().find(x=>x.id===req.params.id);
if(!post) return res.send('Not found');
res.render('pages/detail',{post});
});

app.get('/admin',(req,res)=>{
res.render('admin/login');
});

app.post('/login',(req,res)=>{
const {username,password}=req.body;

if(
username === (process.env.ADMIN_USER || 'admin')
&&
password === (process.env.ADMIN_PASS || '12345')
){
req.session.login=true;
return res.redirect('/admin/dashboard');
}

res.send('Login gagal');
});

app.get('/admin/dashboard',auth,(req,res)=>{
res.render('admin/dashboard',{posts:db()});
});

app.post('/admin/post',auth,(req,res)=>{
const data=db();

const post={
id:Date.now().toString(),
title:req.body.title,
thumb:req.body.thumb,
contentHtml:req.body.contentHtml,
published:true
};

data.unshift(post);
save(data);

res.redirect('/admin/dashboard');
});

app.delete('/admin/delete/:id',auth,(req,res)=>{
const data=db().filter(x=>x.id!==req.params.id);
save(data);
res.redirect('/admin/dashboard');
});

const PORT=process.env.PORT || 8080;

app.listen(PORT,()=>{
console.log('RUNNING PORT '+PORT);
});
