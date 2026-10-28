// Shared daily unique claims. Cloudflare Pages Function; D1 binding BRB_DB.
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const dayVN=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10);
function parseCSV(raw){const rows=[];let row=[],val='',q=false;for(let i=0;i<raw.length;i++){const c=raw[i];if(c==='"'){if(q&&raw[i+1]==='"'){val+='"';i++}else q=!q}else if(c===','&&!q){row.push(val);val=''}else if((c==='\r'||c==='\n')&&!q){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(val);if(row.some(x=>x.trim()))rows.push(row);row=[];val=''}else val+=c}row.push(val);if(row.some(x=>x.trim()))rows.push(row);return rows}
async function allowedIds(request){
 const url=new URL('/api/sheets?kind=en',request.url);
 const res=await fetch(url,{headers:{Accept:'text/csv'}});if(!res.ok)throw Error('Không đọc được Google Sheets');
 const csv=parseCSV(await res.text());const hi=csv.findIndex(r=>r.map(x=>x.trim().toUpperCase()).includes('ID')&&r.map(x=>x.trim().toUpperCase()).includes('COMMENT'));
 if(hi<0)throw Error('CSV thiếu tiêu đề ID/COMMENT');
 const h=csv[hi].map(x=>x.trim().toUpperCase());const idx=n=>h.indexOf(n);const seen=new Set(),ids=[];
 for(const r of csv.slice(hi+1)){
  const id=(r[idx('ID')]||'').trim(),text=(r[idx('COMMENT')]||'').trim().replace(/\s*#CORTIS\s+#코르티스\s*$/i,'').trim();
  const vi=(r[idx('VI_TRANSLATION')]||'').trim(),status=(r[idx('STATUS')]||'ACTIVE').trim().toUpperCase(),lang=(r[idx('LANGUAGE')]||'EN').trim().toUpperCase();
  const key=text.toLowerCase().replace(/\s+/g,' ');
  if(!/^EN-\d{1,6}$/.test(id)||!key||!vi||seen.has(key)||!['EN','ENGLISH'].includes(lang)||['HIDDEN','INACTIVE','FALSE','0'].includes(status))continue;
  seen.add(key);ids.push(id);
 }
 return ids;
}
async function list(db,day){const r=await db.prepare('SELECT comment_id FROM brb_daily_claims WHERE day_key=?').bind(day).all();return (r.results||[]).map(x=>x.comment_id)}
export async function onRequestGet({env}){
 if(!env.BRB_DB)return reply({error:'Thiếu D1 binding BRB_DB'},503);
 const day=dayVN();try{return reply({day,used:await list(env.BRB_DB,day)})}catch(e){return reply({error:'Chưa tạo bảng brb_daily_claims: '+e.message},503)}
}
export async function onRequestPost({request,env}){
 if(!env.BRB_DB)return reply({error:'Thiếu D1 binding BRB_DB'},503);
 if(Number(request.headers.get('content-length')||0)>12000)return reply({error:'Payload quá lớn'},413);
 let body;try{body=await request.json()}catch{return reply({error:'JSON không hợp lệ'},400)}
 if(body.language!=='en')return reply({error:'Ngôn ngữ chưa có dữ liệu'},400);
 const id=String(body.preferred||'').trim();if(!/^EN-\d{1,6}$/.test(id))return reply({error:'Mã comment không hợp lệ'},400);
 const day=dayVN();let valid;try{valid=await allowedIds(request)}catch(e){return reply({error:e.message},503)}
 if(!valid.includes(id))return reply({error:'Câu này không còn thuộc kho Google Sheets'},409);
 try{
  const inserted=await env.BRB_DB.prepare('INSERT INTO brb_daily_claims(day_key, comment_id, claimed_at) VALUES(?,?,?) ON CONFLICT(day_key,comment_id) DO NOTHING RETURNING comment_id').bind(day,id,new Date().toISOString()).first();
  if(inserted?.comment_id)return reply({id,day});
  const used=await list(env.BRB_DB,day);return reply({error:'Câu vừa được người khác sử dụng',day,used,exhausted:valid.every(x=>used.includes(x))},409);
 }catch(e){return reply({error:'Không ghi được D1: '+e.message},503)}
}
