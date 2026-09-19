/* InstagrameAMO: análisis local de una exportación coherente, sin datos al servidor. */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],P=InstagrameParser;
const state={followers:new Set(),following:new Set(),views:{},current:"notFollowingBack",shown:120};
const labels={followers:["Seguidores","Presentes en el archivo de seguidores."],following:["Seguidos","Presentes en el archivo de seguidos."],mutual:["Coincidencias mutuas","Aparecen en ambos archivos."],notFollowingBack:["Sin coincidencia en seguidores","Los seguís, pero no aparecen en el archivo de seguidores. Podrían seguirte actualmente."],youDontFollow:["No los seguís (según archivo)","Aparecen en seguidores y no aparecen en seguidos."]};
function report(message){$("#status").textContent=message;}
async function processFiles(input){
 const files=[...input],found={followers:new Set(),following:new Set()},parts={followers:[],following:[]};
 $("#results").hidden=true;$("#audit").hidden=true;report("Leyendo archivos de conexiones…");
 if(typeof navigator!=="undefined")void checkConnection();
 try{
  if(!files.length)throw Error("Seleccioná el ZIP o los archivos de seguidores y seguidos.");
  if(files.some(f=>/\.zip$/i.test(f.name))&&files.length>1)throw Error("Elegí una sola exportación ZIP por vez. No mezcles archivos ni cuentas.");
  const entries=[];
  for(const file of files){
   if(/\.zip$/i.test(file.name)){
    if(!window.JSZip)throw Error("No se cargó el lector ZIP.");
    if(file.size>250*1024*1024)report("ZIP grande: analizando solo los archivos de seguidores y seguidos. Para próximas exportaciones, elegí solo esa información.");
    const zip=await JSZip.loadAsync(file);
    for(const [path,entry] of Object.entries(zip.files))if(!entry.dir&&P.kindFor(path))entries.push({path,read:()=>entry.async("text")});
   }else if(P.kindFor(file.name))entries.push({path:file.name,read:()=>file.text()});
  }
  const followingFiles=entries.filter(e=>P.kindFor(e.path)==="following");
  const followerFiles=entries.filter(e=>P.kindFor(e.path)==="followers");
  if(!followerFiles.length||!followingFiles.length)throw Error("Exportación incompleta: faltan archivos de seguidores o de seguidos. Elegí ambas listas, formato JSON, intervalo «Desde siempre».");
  if(followingFiles.length!==1)throw Error("Encontré varias listas de seguidos: el ZIP podría contener varios perfiles o copias. Exportá una sola cuenta.");
  const formats=new Set(entries.map(e=>e.path.toLowerCase().split(".").pop()));
  if(formats.size!==1)throw Error("No combines JSON y HTML de exportaciones diferentes.");
  const indexes=followerFiles.map(e=>e.path.split(/[\\/]/).pop().match(/^followers_(\d+)\./i)?.[1]).filter(Boolean).map(Number);
  if(indexes.length){const max=Math.max(...indexes);if(indexes.length!==new Set(indexes).size||Array.from({length:max},(_,i)=>i+1).some(n=>!indexes.includes(n)))throw Error("Faltan partes numeradas de seguidores o hay duplicadas. Importá el ZIP original completo.");}
  if(followerFiles.some(e=>/\/|\\/.test(e.path))&&followingFiles.some(e=>/\/|\\/.test(e.path))){
   const group=path=>path.replace(/\\/g,"/").replace(/\/[^/]+$/,"");
   if(followerFiles.some(e=>group(e.path)!==group(followingFiles[0].path)))throw Error("Seguidores y seguidos provienen de carpetas distintas. Importá una sola exportación de una cuenta.");
  }
  for(const entry of entries){try{const parsed=P.parseEntry(entry.path,await entry.read());if(parsed){parsed.users.forEach(u=>found[parsed.kind].add(u));parts[parsed.kind].push({name:entry.path.split(/[\\/]/).pop(),count:parsed.users.size});}}catch(err){throw Error("No se pudo leer un archivo de conexiones. "+err.message);}}
  if(!found.followers.size||!found.following.size)throw Error("Una lista quedó vacía; no se puede calcular quién no te sigue. Revisá el ZIP y el intervalo de exportación.");
  state.followers=found.followers;state.following=found.following;state.views=P.classify(found.followers,found.following);
  buildViews();$("#results").hidden=false;showAudit(parts);report("Archivos leídos. Resultado basado en la exportación, NO en el estado actual de Instagram.");selectView("notFollowingBack");
 }catch(err){report("No se muestran resultados: "+err.message);}
}
function buildViews(){const v=state.views;$("#nFollowers").textContent=v.followers.length;$("#nFollowing").textContent=v.following.length;$("#nMutual").textContent=v.mutual.length;$("#nNotBack").textContent=v.notFollowingBack.length;$("#nYouDont").textContent=v.youDontFollow.length;}
function showAudit(parts){
 const a=$("#audit");a.hidden=false;a.textContent="";
 const heading=document.createElement("strong");heading.textContent="Control de lectura";a.append(heading);
 const detail=document.createElement("p");detail.textContent=parts.followers.map(x=>x.name+" ("+x.count+")").join(" + ")+" · "+parts.following.map(x=>x.name+" ("+x.count+")").join(" + ");a.append(detail);
 const note=document.createElement("p");note.textContent="Estas listas son una foto de la fecha y del intervalo exportados. No permiten comprobar si alguien te sigue ahora; Instagram puede haber cambiado desde entonces.";a.append(note);
 if(state.following.size>4*state.followers.size){const warning=document.createElement("p");warning.className="warning";warning.textContent="Atención: hay muchos más seguidos que seguidores en los archivos. Puede ser real, pero si sabés que hay cuentas mal clasificadas, comprobá que descargaste la lista COMPLETA de seguidores con intervalo «Desde siempre», JSON y una sola cuenta.";a.append(warning);}
}
function selectView(view){state.current=view;state.shown=120;$$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));const [title,note]=labels[view];$("#viewTitle").textContent=title;$("#viewNote").textContent=note;$("#search").value="";render();}
function render(){
 const q=P.normalize($("#search").value)||$("#search").value.trim().replace(/^@/,"").toLowerCase();
 const rows=(state.views[state.current]||[]).filter(u=>u.includes(q)).sort((a,b)=>a.localeCompare(b));
 const list=$("#list");list.textContent="";
 if(!rows.length){const e=document.createElement("div");e.className="empty";e.textContent="No hay cuentas para mostrar.";list.append(e);return;}
 for(const u of rows.slice(0,state.shown)){
  const row=document.createElement("div"),a=document.createElement("a"),s=document.createElement("span");
  row.className="person";a.href="https://www.instagram.com/"+encodeURIComponent(u)+"/";a.target="_blank";a.rel="noopener noreferrer";a.textContent="@"+u;s.textContent="Comprobar en Instagram ↗";row.append(a,s);list.append(row);
 }
 if(rows.length>state.shown){const more=document.createElement("button");more.className="more";more.textContent="Mostrar más · "+state.shown+" de "+rows.length;more.onclick=()=>{state.shown+=120;render();};list.append(more);}
}
function exportCsv(){
 const rows=(state.views[state.current]||[]).slice().sort(),csv=["usuario",...rows.map(x=>'"'+x.replace(/"/g,'""')+'"')].join("\r\n");
 const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="instagrameamo-"+state.current+"-segun-exportacion.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
$("#pick").onclick=()=>$("#files").click();$("#files").onchange=e=>processFiles(e.target.files);$("#search").oninput=()=>{state.shown=120;render();};$("#csv").onclick=exportCsv;
$$("[data-view]").forEach(b=>b.onclick=()=>selectView(b.dataset.view));
const drop=$("#drop");for(const ev of ["dragenter","dragover"])drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("drag");});
for(const ev of ["dragleave","drop"])drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("drag");});
drop.addEventListener("drop",e=>processFiles(e.dataTransfer.files));

// Comprobación de conectividad independiente del análisis del ZIP: nunca contacta Instagram.
let connectionCheckId=0;
async function checkConnection(){
 if(typeof navigator==="undefined"||typeof location==="undefined")return;
 const stamp=++connectionCheckId, indicator=$("#connection-state");
 const show=(message,status)=>{if(stamp===connectionCheckId){indicator.textContent=message;indicator.dataset.state=status;}};
 if(!navigator.onLine){show("Sin conexión detectada · el análisis local funciona","offline");return;}
 if(location.protocol==="file:"){show("Archivo local · conexión no verificada","unknown");return;}
 if(!["http:","https:"].includes(location.protocol)){show("Conexión no verificable","unknown");return;}
 show("Comprobando acceso al sitio…","unknown");
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
 try{
  const url=new URL("./parser.js",location.href);url.searchParams.set("conexion",String(Date.now()));
  const response=await fetch(url,{method:"HEAD",cache:"no-store",signal:controller.signal});
  show(response.ok?"Online · sitio accesible":"Sin acceso al sitio · podés analizar offline",response.ok?"online":"offline");
 }catch{show("Sin acceso al sitio · podés analizar offline","offline");}
 finally{clearTimeout(timer);}
}
if(typeof navigator!=="undefined"){
 $("#check-connection").onclick=checkConnection;
 if(typeof window.addEventListener==="function"){
  window.addEventListener("online",checkConnection);
  window.addEventListener("offline",checkConnection);
 }
 void checkConnection();
}
