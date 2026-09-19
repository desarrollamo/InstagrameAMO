const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),P=require("../parser.js");
const nodes=new Map(),node=()=>({hidden:false,textContent:"",addEventListener(){},classList:{add(){},remove(){},toggle(){}},value:""});
const doc={querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},querySelectorAll(){return []}};
const context={document:doc,InstagrameParser:P,window:{},console,File,Blob,URL,setTimeout};
vm.createContext(context);vm.runInContext(fs.readFileSync(require("node:path").join(__dirname,"../app.js"),"utf8"),context);
async function run(){
 const following=new File([JSON.stringify({relationships_following:[{string_list_data:[{value:"diego"}]}]})],"following.json");
 await vm.runInContext("processFiles",context)([following]);
 assert.equal(doc.querySelector("#results").hidden,true);
 assert.match(doc.querySelector("#status").textContent,/faltan archivos/);
 console.log("PASS: exportación incompleta bloqueada sin publicar falsos resultados");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
