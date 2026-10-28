// Same-origin proxy for the public Google Sheets CSV exports (Pages Functions Free quota applies).
// Only predefined public Google publishing URLs may be requested.
const PUBLISHED = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSASRBKEiLc56BHjdDwUvzKwomKDPC4O2pIyTCMkxnPIJNp2Nn10qMGFmj5hJKEdZJ9f9K6eNVmvoeM/pub';
const SHEETS={en:'0',settings:'504546554'};
export async function onRequestGet({request}) {
 const kind=new URL(request.url).searchParams.get('kind');
 if(!Object.hasOwn(SHEETS,kind))return new Response('Unknown sheet',{status:404});
 try {
  const remote=`${PUBLISHED}?gid=${SHEETS[kind]}&single=true&output=csv`;
  const response=await fetch(remote,{redirect:'follow',headers:{'Accept':'text/csv,text/plain,*/*'}});
  if(!response.ok)throw new Error(`Google HTTP ${response.status}`);
  const body=await response.text();
  if(/^\s*<!doctype html|^\s*<html/i.test(body))throw new Error('Google returned HTML instead of CSV');
  return new Response(body,{headers:{'Content-Type':'text/csv; charset=utf-8','Cache-Control':'public, max-age=60, s-maxage=180'}});
 }catch(e){return new Response('Google Sheet unavailable: '+String(e.message||e),{status:502,headers:{'Cache-Control':'no-store'}})}
}
