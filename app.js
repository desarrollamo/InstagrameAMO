/* InstagrameAMO: análisis local de una exportación coherente, sin datos al servidor. */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],P=InstagrameParser;
const state={followers:new Set(),following:new Set(),views:{},current:"notFollowingBack",page:0,pageSize:100};
const labels={followers:["Seguidores","Presentes en el archivo de seguidores."],following:["Seguidos","Presentes en el archivo de seguidos."],mutual:["Coincidencias mutuas","Aparecen en ambos archivos."],notFollowingBack:["Sin coincidencia en seguidores","Los seguís, pero no aparecen en el archivo de seguidores. Podrían seguirte actualmente."],youDontFollow:["No los seguís (según archivo)","Aparecen en seguidores y no aparecen en seguidos."]};
function report(message){$("#status").textContent=message;}
let processing=false;
function updateLoading(label,done=null,total=null,detail=""){
 const panel=$("#loading"),track=$("#loading-track"),bar=$("#loading-bar"),pct=$("#loading-percent");
 panel.hidden=false;$("#loading-label").textContent=label;$("#loading-detail").textContent=detail||"Los archivos se analizan solamente en este navegador.";
 const determinate=Number.isFinite(done)&&Number.isFinite(total)&&total>0;
 track.classList.toggle("indeterminate",!determinate);
 if(determinate){
  const value=Math.max(0,Math.min(100,Math.round(done/total*100)));
  bar.style.width=value+"%";pct.textContent=value+"%";track.setAttribute("aria-valuenow",String(value));
 }else{
  bar.style.width="";pct.textContent="";track.removeAttribute("aria-valuenow");
 }
}
function showPartial(found,parts){
 const preview=$("#loading-preview");preview.hidden=false;
 const count=kind=>parts[kind].length?String(found[kind].size)+" (provisional)":"pendiente";
 preview.textContent="Seguidores leídos: "+count("followers")+" · Seguidos leídos: "+count("following")+". Las comparaciones aparecen al finalizar ambas listas.";
}
async function allowPaint(){
 if(typeof requestAnimationFrame==="function")await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
 else await new Promise(resolve=>setTimeout(resolve,0));
}
async function processFiles(input){
 if(processing){report("Ya hay una exportación en proceso. Esperá a que termine.");return;}
 processing=true;$("#pick").disabled=true;
 const files=[...input],found={followers:new Set(),following:new Set()},parts={followers:[],following:[]},periods=[],openArchives=[];
 $("#results").hidden=true;$("#audit").hidden=true;$("#limited-export").hidden=true;$("#loading-preview").hidden=true;
 report("Leyendo archivos de conexiones…");
 updateLoading("Preparando exportación…",null,null,"Identificando los archivos necesarios.");
 if(typeof navigator!=="undefined")void checkConnection();
 await allowPaint();
 try{
  if(!files.length)throw Error("Seleccioná el ZIP o los archivos de seguidores y seguidos.");
  if(files.some(f=>/\.zip$/i.test(f.name))&&files.length>1)throw Error("Elegí una sola exportación ZIP por vez. No mezcles archivos ni cuentas.");
  const entries=[];
  for(const file of files){
   if(/\.zip$/i.test(file.name)){
    if(!window.zip?.ZipReader)throw Error("No se cargó el lector ZIP.");
    report("Leyendo índice ZIP sin cargar fotos ni videos…");
    updateLoading("Revisando índice del ZIP…",null,null,"El tamaño del ZIP no indica cuánto falta: primero se localizan las listas de conexiones.");
    await allowPaint();
    const reader=new zip.ZipReader(new zip.BlobReader(file),{useWebWorkers:false});
    openArchives.push(reader);
    const archiveEntries=await reader.getEntries();
    for(const entry of archiveEntries)if(!entry.directory&&P.kindFor(entry.filename))entries.push({path:entry.filename,read:onprogress=>entry.getData(new zip.TextWriter(),{useWebWorkers:false,onprogress})});
    report("Índice listo: "+archiveEntries.length+" entradas; solo "+entries.length+" archivos de conexiones se descomprimirán.");
    updateLoading("Encontradas "+entries.length+" listas de conexiones",0,entries.length,"No se descomprimen fotografías ni videos.");
    await allowPaint();
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
  let lastProgressAt=0;
  for(const [index,entry] of entries.entries()){
   const label="Leyendo lista "+(index+1)+" de "+entries.length;
   report("Procesando archivo de conexiones "+(index+1)+"/"+entries.length+"…");
   updateLoading(label,index,entries.length,"Se descomprimen únicamente las listas de seguidores y seguidos.");
   await allowPaint();
   try{
    const onprogress=(loaded,total)=>{
     const now=Date.now();if(now-lastProgressAt<90&&loaded<total)return;lastProgressAt=now;
     if(total>0)updateLoading(label,index+Math.min(1,loaded/total),entries.length,"Lectura del archivo actual; no se extraen fotos ni videos.");
    };
    const parsed=P.parseEntry(entry.path,await entry.read(onprogress));
    if(parsed){parsed.users.forEach(u=>found[parsed.kind].add(u));parts[parsed.kind].push({name:entry.path.split(/[\\/]/).pop(),count:parsed.users.size,years:parsed.years});if(parsed.period)periods.push(parsed.period);showPartial(found,parts);}
    updateLoading("Listas leídas: "+(index+1)+" de "+entries.length,index+1,entries.length,"Conteos provisionales hasta completar todas las listas.");
   }catch(err){throw Error("No se pudo leer un archivo de conexiones. "+err.message);}
  }
  if(!found.followers.size||!found.following.size)throw Error("Una lista quedó vacía; no se puede calcular quién no te sigue. Revisá el ZIP y el intervalo de exportación.");
  const limited=periods.find(p=>p.limited);
  const earliest=kind=>{const years=parts[kind].map(x=>x.years?.earliest).filter(Number.isFinite);return years.length?Math.min(...years):null;};
  const firstFollower=earliest("followers"),firstFollowing=earliest("following");
  const differentCoverage=firstFollower!==null&&firstFollowing!==null&&firstFollowing<firstFollower;
  if(limited||differentCoverage){
   $("#limited-export").hidden=false;
   $("#period-from").textContent=limited?.from||"no identificado";$("#period-to").textContent=limited?.to||"no identificado";
   $("#coverage-detail").textContent=differentCoverage
    ?"El archivo de seguidores registra cuentas con fechas desde "+firstFollower+", pero el de seguidos incluye registros desde "+firstFollowing+". Se están comparando conjuntos con coberturas distintas: sus tamaños y diferencias NO equivalen a los del perfil actual."
    :"Los archivos incluyen un período solicitado acotado y no se ha podido confirmar que sus listas representen las relaciones actuales completas de la cuenta.";
   $("#limited-followers").textContent=String(found.followers.size);$("#limited-following").textContent=String(found.following.size);
   report("Las listas exportadas no permiten concluir quién te sigue actualmente.");
   updateLoading("Lectura completada",1,1,"Se detectaron datos cuya cobertura no permite comparaciones fiables.");
   return;
  }
  updateLoading("Calculando coincidencias…",null,null,"Ambas listas están completas. Preparando resultados.");
  await allowPaint();
  state.followers=found.followers;state.following=found.following;state.views=P.classify(found.followers,found.following);
  buildViews();$("#results").hidden=false;showAudit(parts);report("Archivos leídos. Resultado basado en la exportación, NO en el estado actual de Instagram.");selectView("notFollowingBack");
  updateLoading("Análisis finalizado",1,1,"Las cinco métricas están calculadas.");
 }catch(err){report("No se muestran resultados: "+err.message);}
 finally{await Promise.allSettled(openArchives.map(reader=>reader.close()));$("#loading").hidden=true;$("#pick").disabled=false;processing=false;}
}
function buildViews(){const v=state.views;$("#nFollowers").textContent=v.followers.length;$("#nFollowing").textContent=v.following.length;$("#nMutual").textContent=v.mutual.length;$("#nNotBack").textContent=v.notFollowingBack.length;$("#nYouDont").textContent=v.youDontFollow.length;}
function showAudit(parts){
 const a=$("#audit");a.hidden=false;a.textContent="";
 const heading=document.createElement("strong");heading.textContent="Control de lectura";a.append(heading);
 const detail=document.createElement("p");detail.textContent=parts.followers.map(x=>x.name+" ("+x.count+")").join(" + ")+" · "+parts.following.map(x=>x.name+" ("+x.count+")").join(" + ");a.append(detail);
 const note=document.createElement("p");note.textContent="Estas listas son una foto de la fecha y del intervalo exportados. No permiten comprobar si alguien te sigue ahora; Instagram puede haber cambiado desde entonces.";a.append(note);
 if(state.following.size>4*state.followers.size){const warning=document.createElement("p");warning.className="warning";warning.textContent="Atención: hay muchos más seguidos que seguidores en los archivos. Puede ser real, pero si sabés que hay cuentas mal clasificadas, comprobá que descargaste la lista COMPLETA de seguidores con intervalo «Desde siempre», JSON y una sola cuenta.";a.append(warning);}
}
function selectView(view){state.current=view;state.page=0;$$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));const [title,note]=labels[view];$("#viewTitle").textContent=title;$("#viewNote").textContent=note;$("#search").value="";render();}
function render(){
 const q=$("#search").value.trim().replace(/^@/,"").toLowerCase();
 const rows=(state.views[state.current]||[]).filter(u=>u.includes(q)).sort((a,b)=>a.localeCompare(b));
 const list=$("#list");list.textContent="";
 if(!rows.length){const e=document.createElement("div");e.className="empty";e.textContent="No hay cuentas para mostrar.";list.append(e);return;}
 const pageCount=Math.ceil(rows.length/state.pageSize);state.page=Math.min(state.page,pageCount-1);
 const first=state.page*state.pageSize,fragment=document.createDocumentFragment();
 for(const u of rows.slice(first,first+state.pageSize)){
  const row=document.createElement("div"),a=document.createElement("a"),s=document.createElement("span");
  row.className="person";a.href="https://www.instagram.com/"+encodeURIComponent(u)+"/";a.target="_blank";a.rel="noopener noreferrer";a.textContent="@"+u;s.textContent="Comprobar en Instagram ↗";row.append(a,s);fragment.append(row);
 }
 list.append(fragment);
 const controls=document.createElement("nav");controls.className="page-controls";controls.setAttribute("aria-label","Páginas de resultados");
 const prev=document.createElement("button");prev.textContent="← Anterior";prev.disabled=state.page===0;prev.onclick=()=>{state.page--;render();};
 const info=document.createElement("span");info.textContent="Página "+(state.page+1)+" de "+pageCount+" · "+rows.length+" cuentas";
 const next=document.createElement("button");next.textContent="Siguiente →";next.disabled=state.page>=pageCount-1;next.onclick=()=>{state.page++;render();};
 controls.append(prev,info,next);list.append(controls);
}
function exportCsv(){
 const rows=(state.views[state.current]||[]).slice().sort(),csv=["usuario",...rows.map(x=>'"'+x.replace(/"/g,'""')+'"')].join("\r\n");
 const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="instagrameamo-"+state.current+"-segun-exportacion.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
$("#pick").onclick=()=>$("#files").click();$("#files").onchange=e=>processFiles(e.target.files);let searchTimer;$("#search").oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.page=0;render();},180);};$("#csv").onclick=exportCsv;
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
