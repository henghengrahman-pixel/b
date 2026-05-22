async function login(e){

e.preventDefault();

const u = document.getElementById('username').value;
const p = document.getElementById('password').value;

const r = await fetch('/api/login',{
method:'POST',
credentials:'same-origin',
headers:{
'Content-Type':'application/json'
},
body:JSON.stringify({
username:u,
password:p
})
});

const data = await r.json();

if(!r.ok){
alert(data.error || 'Login gagal');
return false;
}

location.href='/admin/dashboard';

return false;

}
