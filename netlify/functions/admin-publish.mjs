import { timingSafeEqual } from 'node:crypto';

const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const compare=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&x.length>0&&timingSafeEqual(x,y)};
const ghHeaders=token=>({'Authorization':`Bearer ${token}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'});
async function getContents({repo,branch,token},path){const r=await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,{headers:ghHeaders(token)});if(r.status===404)return null;if(!r.ok)throw Error(`GitHub GET (${r.status})`);return r.json()}
async function putContents(ctx,path,buffer,message){const existing=await getContents(ctx,path);const r=await fetch(`https://api.github.com/repos/${ctx.repo}/contents/${path}`,{method:'PUT',headers:ghHeaders(ctx.token),body:JSON.stringify({message,branch:ctx.branch,sha:existing?.sha,content:Buffer.from(buffer).toString('base64')})});if(!r.ok){const body=await r.json().catch(()=>({}));throw Error(`GitHub PUT ${r.status}: ${body.message||'Không thể ghi file'}`)}return r.json()}
async function readJson(ctx,path,fallback){const existing=await getContents(ctx,path);if(!existing)return fallback;const raw=Buffer.from(existing.content.replace(/\s/g,''),'base64').toString('utf8');return JSON.parse(raw)}
const normalized=s=>String(s||'').trim().replace(/\s+/g,' ').toLowerCase();
export default async function handler(req){
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  const password=Netlify.env.get('ADMIN_PASSWORD');
  if(!password)return reply({error:'Chưa cấu hình ADMIN_PASSWORD trên Netlify'},503);
  if(Number(req.headers.get('content-length')||0)>6500000)return reply({error:'File quá lớn'},413);
  let body;try{body=await req.json()}catch{return reply({error:'JSON không hợp lệ'},400)}
  if(!compare(body.password,password))return reply({error:'Mật khẩu không đúng'},401);
  if(body.action==='verify')return reply({ok:true});
  const token=Netlify.env.get('GITHUB_TOKEN'),repo=Netlify.env.get('GITHUB_REPO'),branch=Netlify.env.get('GITHUB_BRANCH')||'main';
  if(!token||!repo||!repo.includes('/'))return reply({error:'Thiếu GITHUB_TOKEN / GITHUB_REPO trên Netlify'},503);
  const ctx={token,repo,branch};
  try{
    if(body.action==='comments'){
      if(!Array.isArray(body.comments)||body.comments.length>1200)throw Error('Chỉ nhận 1–1200 comment mỗi lần');
      const groups={en:[],ko:[]};for(const row of body.comments){
        const language=String(row.language||'').trim().toLowerCase(),text=String(row.text||'').trim(),vi=String(row.vi||'').trim();
        if(!['en','ko'].includes(language)||!text||!vi||text.length>3000||vi.length>3000)throw Error('Comment không hợp lệ');
        groups[language].push({id:String(row.id||'').trim(),text,vi});
      }
      let added=0,duplicates=0;
      for(const lang of ['en','ko']){
        if(!groups[lang].length)continue;
        const path=`site/data/comments-${lang}.json`,rows=await readJson(ctx,path,[]);
        const seen=new Set(rows.map(r=>normalized(r.text))),ids=new Set(rows.map(r=>r.id));
        for(const row of groups[lang]){
          const key=normalized(row.text);
          if(seen.has(key)){duplicates++;continue;}
          const prefix=lang==='en'?'EN':'KR';
          let id=row.id;if(!id||ids.has(id)){let n=rows.length+1;do{id=`${prefix}-${String(n++).padStart(4,'0')}`}while(ids.has(id))}
          rows.push({id,text:row.text,vi:row.vi});seen.add(key);ids.add(id);added++;
        }
        await putContents(ctx,path,JSON.stringify(rows,null,2),'Admin: update '+lang+' comments');
      }
      return reply({ok:true,added,duplicates});
    }
    if(body.action==='settings'){
      const current=await readJson(ctx,'site/data/settings.json',{background:'',position:'center 32%'});
      const settings={background:String(body.settings?.background??current.background),position:String(body.settings?.position??current.position)};
      if(settings.background && !/^\/assets\/background\.(jpg|png|webp)$/.test(settings.background))throw Error('Đường dẫn ảnh không hợp lệ');
      if(settings.position.length>60)throw Error('Vị trí ảnh không hợp lệ');
      await putContents(ctx,'site/data/settings.json',JSON.stringify(settings,null,2),'Admin: update website settings');return reply({ok:true});
    }
    if(body.action==='image'){
      const mime=String(body.mime||'');const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[mime];
      if(!ext||typeof body.base64!=='string'||body.base64.length>6000000||!/^[A-Za-z0-9+/=]+$/.test(body.base64))throw Error('Ảnh phải là JPG/PNG/WEBP, tối đa 4 MB');
      const bytes=Buffer.from(body.base64,'base64');if(bytes.length>4*1024*1024)throw Error('Ảnh quá lớn');
      const path=`site/assets/background.${ext}`;
      await putContents(ctx,path,bytes,'Admin: upload background image');
      await putContents(ctx,'site/data/settings.json',JSON.stringify({background:`/assets/background.${ext}`,position:'center 32%'},null,2),'Admin: activate background image');
      return reply({ok:true});
    }
    return reply({error:'Thao tác không hỗ trợ'},400);
  }catch(err){return reply({error:String(err.message||err)},400)}
}
