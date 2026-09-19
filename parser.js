/* Parser estricto de exportaciones Instagram: funciona localmente en el navegador. */
(function(root){
"use strict";
const userPattern=/^[a-z0-9._]{1,30}$/;
function normalize(value){const s=String(value??"").trim().replace(/^@/,"").toLowerCase();return userPattern.test(s)?s:"";}
function fromHref(raw){try{const url=new URL(String(raw));if(!["instagram.com","www.instagram.com","m.instagram.com"].includes(url.hostname.toLowerCase()))return "";let parts=url.pathname.split("/").filter(Boolean);if(parts[0]==="_u")parts=parts.slice(1);if(parts.length!==1)return "";return normalize(decodeURIComponent(parts[0]));}catch{return "";}}
function kindFor(path){const name=String(path).split(/[\\/]/).pop().toLowerCase();if(/^followers(?:_\d+)?\.(?:json|html)$/.test(name))return"followers";if(/^following\.(?:json|html)$/.test(name))return"following";return"";}
function readRecord(item){if(!item||typeof item!=="object"||!Array.isArray(item.string_list_data))return"";for(const entry of item.string_list_data){const fromValue=normalize(entry?.value),fromLink=fromHref(entry?.href);if(fromValue)return fromValue;if(fromLink)return fromLink;}return"";}
function jsonUsers(text,kind){const data=JSON.parse(text),rows=Array.isArray(data)?data:(kind==="following"?data.relationships_following:data.relationships_followers);if(!Array.isArray(rows))throw new Error("Estructura JSON no reconocida para "+kind);const out=new Set();for(const row of rows){const u=readRecord(row);if(u)out.add(u);}return out;}
function htmlUsers(text){if(typeof DOMParser==="undefined")throw new Error("HTML requiere el navegador");const doc=new DOMParser().parseFromString(text,"text/html"),out=new Set();for(const a of doc.querySelectorAll("a[href]")){const u=fromHref(a.getAttribute("href"));if(u)out.add(u);}return out;}
function htmlExportPeriod(text){
 const header=String(text).slice(0,32000);
 if(!/Contiene los datos que has solicitado desde/i.test(header))return null;
 const times=[...header.matchAll(/<time\b[^>]*\bdatetime=["']([^"']+)["'][^>]*>([^<]*)<\/time>/gi)];
 const values=times.map(m=>Date.parse(m[1]));
 if(values.length<3||!Number.isFinite(values[1])||!Number.isFinite(values[2])||values[2]<=values[1])return null;
 const days=(values[2]-values[1])/86400000;
 return{from:times[1][2].trim(),to:times[2][2].trim(),limited:days>0&&days<=400};
}
function htmlRecordYears(text){
 const years=[...String(text).matchAll(/(?:ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic|jan|apr|aug|dec)[a-z]*\.?\s+\d{1,2},?\s+(20\d{2})/gi)].map(m=>Number(m[1])).filter(y=>y>=2010&&y<=new Date().getFullYear()+1);
 return years.length?{earliest:Math.min(...years),latest:Math.max(...years),records:years.length}:null;
}
function parseEntry(path,text){const kind=kindFor(path);if(!kind)return null;const html=/\.html$/i.test(path);return{kind,users:html?htmlUsers(text):jsonUsers(text,kind),period:html?htmlExportPeriod(text):null,years:html?htmlRecordYears(text):null};}
function classify(followers,following){const mutual=[...followers].filter(u=>following.has(u)),notFollowingBack=[...following].filter(u=>!followers.has(u)),youDontFollow=[...followers].filter(u=>!following.has(u));return{followers:[...followers],following:[...following],mutual,notFollowingBack,youDontFollow};}
const api={normalize,fromHref,kindFor,jsonUsers,htmlUsers,htmlExportPeriod,htmlRecordYears,parseEntry,classify};root.InstagrameParser=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
