'use strict';
const ts=require('typescript'),path=require('node:path');
module.exports=function(source){
 if(this.resourcePath.endsWith('.css')){
  const prefix=path.basename(this.resourcePath).split('.')[0]+'_',names={};
  const css=source.replace(/:global\(([^)]+)\)/g,'$1').replace(/\.([a-zA-Z_][\w-]*)/g,(_m,key)=>{names[key]=prefix+key;return '.'+prefix+key;});
  return 'const style=document.createElement("style");style.textContent='+JSON.stringify(css)+';document.head.append(style);export default '+JSON.stringify(names)+';';
 }
 return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
};
