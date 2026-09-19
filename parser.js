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
function parseEntry(path,text){const kind=kindFor(path);if(!kind)return null;return{kind,users:path.toLowerCase().endsWith(".json")?jsonUsers(text,kind):htmlUsers(text)};}
function classify(followers,following){const mutual=[...followers].filter(u=>following.has(u)),notFollowingBack=[...following].filter(u=>!followers.has(u)),youDontFollow=[...followers].filter(u=>!following.has(u));return{followers:[...followers],following:[...following],mutual,notFollowingBack,youDontFollow};}
const api={normalize,fromHref,kindFor,jsonUsers,htmlUsers,parseEntry,classify};root.InstagrameParser=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
