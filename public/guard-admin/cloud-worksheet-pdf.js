// PDF bytes stay in this browser. Only explicitly selected, flattened JPG pages
// enter the existing verified worksheet image upload protocol.
export const PDF_MAX_BYTES = 20 * 1048576;
export const PDF_MAX_PAGES = 200;
export const PDF_MAX_SELECTION = 50;
export function worksheetPdfPages(value, count) {
  const pages = new Set();
  if (!Number.isInteger(count) || count < 1 || count > PDF_MAX_PAGES || typeof value !== 'string' || value.length > 500) throw Error('Choose pages from this PDF.');
  for (const term of value.split(',')) {
    const match = term.trim().match(/^(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/);
    if (!match) throw Error('Enter page numbers like 1, 3-5.');
    const first = Number(match[1]), last = Number(match[2] || first);
    if (first < 1 || last < first || last > count) throw Error(`Choose pages between 1 and ${count}.`);
    for (let page = first; page <= last; page++) {
      pages.add(page);
      if (pages.size > PDF_MAX_SELECTION) throw Error(`Add up to ${PDF_MAX_SELECTION} pages at a time.`);
    }
  }
  return [...pages].sort((a,b) => a-b);
}
function pdfError(error) {
  if (error?.name === 'PasswordException') return Error('This PDF needs a password. Save an unlocked copy, then choose it here.');
  if (error?.name === 'InvalidPDFException' || error?.name === 'UnknownErrorException') return Error('This PDF could not be read. Try another copy of the file.');
  return error instanceof Error ? error : Error('This PDF could not be converted. Choose it again.');
}
async function bounded(promise, cancel, message) {
  let timer;
  try { return await Promise.race([promise,new Promise((_resolve,reject)=>{timer=setTimeout(()=>{try{cancel?.();}catch{/* Preserve the timeout message. */}reject(Error(message));},30000);})]); }
  finally { clearTimeout(timer); }
}
export async function openWorksheetPdf(file) {
  if (!file?.size || file.size > PDF_MAX_BYTES) throw Error('Choose a PDF up to 20 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder('latin1').decode(bytes.subarray(0,1024)).includes('%PDF-')) throw Error('That file is not a readable PDF.');
  let loading, pdf, closed = false, task = null;
  try {
    const base = new URL('./pdfjs/', import.meta.url);
    const library = await bounded(import(new URL('pdf.mjs', base).href),null,'PDF tools could not load. Check your connection and choose the file again.');
    library.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.mjs', base).href;
    loading = library.getDocument({data:bytes,isEvalSupported:false,enableXfa:false,useWasm:false,
      cMapUrl:new URL('cmaps/',base).href,cMapPacked:true,standardFontDataUrl:new URL('standard_fonts/',base).href,
      wasmUrl:new URL('wasm/',base).href,canvasMaxAreaInBytes:32*1048576,stopAtErrors:true});
    pdf = await bounded(loading.promise,()=>{void loading.destroy().catch(()=>{});},'This PDF took too long to open. Try a smaller file or another copy.');
    if (pdf.numPages < 1 || pdf.numPages > PDF_MAX_PAGES) throw Error(`Choose a PDF with up to ${PDF_MAX_PAGES} pages.`);
    return {
      numPages:pdf.numPages,
      async render(pageNumber) {
        if (closed || !Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pdf.numPages) throw Error('Choose a page from the current PDF.');
        let page, canvas;
        try {
          page = await pdf.getPage(pageNumber);
          const original = page.getViewport({scale:1});
          if (![original.width,original.height].every(n=>Number.isFinite(n)&&n>0)) throw Error('This PDF page has an invalid size.');
          // 200 DPI on normal school paper, bounded for phone memory and unusual
          // large-format PDFs. Render one page at a time, including form values.
          const scale = Math.min(200/72,3300/Math.max(original.width,original.height),Math.sqrt(8000000/(original.width*original.height)));
          const viewport = page.getViewport({scale});
          canvas = document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          const context = canvas.getContext('2d',{alpha:false});
          if (!context) throw Error('This browser could not prepare the worksheet. Try another browser.');
          task = page.render({canvasContext:context,viewport,background:'rgb(255,255,255)',annotationMode:library.AnnotationMode.ENABLE_STORAGE});
          await bounded(task.promise,()=>task?.cancel(),'This PDF page took too long to convert. Try another page or a simpler copy.');
          const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.94));
          if (!blob || blob.type !== 'image/jpeg' || !blob.size || blob.size > 12*1048576) throw Error('This PDF page is too large to save as a worksheet.');
          if (closed) throw Error('This PDF was closed. Choose it again.');
          return {bytes:new Uint8Array(await blob.arrayBuffer()),mime:'image/jpeg',blob,pageNumber,width:canvas.width,height:canvas.height};
        } catch(error) { throw pdfError(error); }
        finally { task=null;if(canvas){canvas.width=0;canvas.height=0;}page?.cleanup(); }
      },
      async close() { if(closed)return;closed=true;task?.cancel();await loading.destroy(); }
    };
  } catch(error) { await loading?.destroy().catch(()=>{});throw pdfError(error); }
}
