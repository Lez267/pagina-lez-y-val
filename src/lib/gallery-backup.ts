import type { Memory } from '../data/types';

type Entry = { name: string; bytes: Uint8Array<ArrayBuffer> };
const encoder = new TextEncoder();
const PART_BYTES = 64 * 1024 * 1024;
const FILE_BYTES = 110 * 1024 * 1024;
const crcTable = Array.from({length:256},(_,index)=>{let crc=index;for(let bit=0;bit<8;bit++)crc=(crc&1)?0xedb88320^(crc>>>1):crc>>>1;return crc>>>0;});
function crc32(bytes: Uint8Array) { let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0; }
/** Standard ZIP STORE with UTF-8 names and CRC32; photos/videos are not recompressed. */
export function buildStoreZip(entries: readonly Entry[]): Uint8Array<ArrayBuffer> {
  if(entries.length>60000)throw new Error('Demasiados archivos en una parte.');
  const names=entries.map(item=>encoder.encode(item.name));
  const total=entries.reduce((sum,item,index)=>sum+item.bytes.length+76+names[index].length*2,22);
  if(total>=0xffffffff)throw new Error('La parte supera el límite ZIP.');
  const result=new Uint8Array(total),view=new DataView(result.buffer);let position=0;
  const records:{offset:number;crc:number}[]=[];
  for(let index=0;index<entries.length;index++){
    const item=entries[index],name=names[index],offset=position,crc=crc32(item.bytes);records.push({offset,crc});
    view.setUint32(position,0x04034b50,true);view.setUint16(position+4,20,true);view.setUint16(position+6,0x800,true);view.setUint16(position+12,33,true);
    view.setUint32(position+14,crc,true);view.setUint32(position+18,item.bytes.length,true);view.setUint32(position+22,item.bytes.length,true);view.setUint16(position+26,name.length,true);
    result.set(name,position+30);result.set(item.bytes,position+30+name.length);position+=30+name.length+item.bytes.length;
  }
  const centralOffset=position;
  for(let index=0;index<entries.length;index++){
    const item=entries[index],name=names[index],record=records[index];
    view.setUint32(position,0x02014b50,true);view.setUint16(position+4,20,true);view.setUint16(position+6,20,true);view.setUint16(position+8,0x800,true);view.setUint16(position+14,33,true);
    view.setUint32(position+16,record.crc,true);view.setUint32(position+20,item.bytes.length,true);view.setUint32(position+24,item.bytes.length,true);view.setUint16(position+28,name.length,true);view.setUint32(position+42,record.offset,true);
    result.set(name,position+46);position+=46+name.length;
  }
  view.setUint32(position,0x06054b50,true);view.setUint16(position+8,entries.length,true);view.setUint16(position+10,entries.length,true);view.setUint32(position+12,position-centralOffset,true);view.setUint32(position+16,centralOffset,true);
  return result;
}
function download(name:string,bytes:Uint8Array<ArrayBuffer>){const url=URL.createObjectURL(new Blob([bytes.buffer],{type:'application/zip'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
const jsonEntry=(name:string,value:unknown):Entry=>({name,bytes:encoder.encode(JSON.stringify(value,null,2))});
async function mediaBytes(url:string,signal:AbortSignal){
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||parsed.hostname!=='res.cloudinary.com'||parsed.username||parsed.password||!parsed.pathname.startsWith('/dc7x4qjzu/'))throw new Error('Origen no permitido; su URL se conserva en el manifiesto.');
  const response=await fetch(parsed.href,{credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.any([signal,AbortSignal.timeout(60000)])});
  if(!response.ok||!response.body)throw new Error('No se pudo descargar ('+response.status+').');
  if(Number(response.headers.get('content-length'))>FILE_BYTES)throw new Error('Archivo mayor de 110 MB; descarga directa indicada en el manifiesto.');
  const reader=response.body.getReader(),chunks:Uint8Array<ArrayBuffer>[]=[];let size=0;
  try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>FILE_BYTES){await reader.cancel();throw new Error('Archivo mayor de 110 MB; su URL se conserva.');}chunks.push(new Uint8Array(item.value));}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
export async function downloadGalleryBackup(memories:readonly Memory[],options:{signal:AbortSignal;onProgress:(message:string)=>void;rawRecords?:unknown}){
  const assets=[...new Map(memories.flatMap(memory=>memory.media.map(media=>[media.url,media] as const))).values()];
  if(assets.length>10000)throw new Error('Exporta menos de 10000 archivos por respaldo.');
  const stamp=new Date().toISOString().replaceAll(':','-'),prefix='recuerdos-'+stamp;
  const manifest:{url:string;path:string;status:'downloaded'|'failed';bytes?:number;sha256?:string;part?:number;error?:string}[]=[];
  let entries:Entry[]=[jsonEntry('recuerdos-visibles.json',memories),...(options.rawRecords ? [jsonEntry('firestore-original.json',options.rawRecords)] : [])],bytes=0,part=1,downloaded=0; bytes=entries.reduce((sum,item)=>sum+item.bytes.length,0);
  const flush=()=>{if(!entries.length)return;download(prefix+'-parte-'+String(part).padStart(3,'0')+'.zip',buildStoreZip(entries));entries=[];bytes=0;part++;};
  for(let index=0;index<assets.length;index++){
    if(options.signal.aborted)break;
    const asset=assets[index];options.onProgress('Descargando '+(index+1)+' de '+assets.length+' archivos…');
    let extension=asset.type==='video'?'mp4':'jpg';
    try { extension=/\.([A-Za-z0-9]{1,8})$/.exec(new URL(asset.url).pathname)?.[1]??extension; } catch {}
    const name='archivos/'+String(index+1).padStart(5,'0')+'.'+extension;
    try{
      const content=await mediaBytes(asset.url,options.signal);
      if(bytes+content.length>PART_BYTES)flush();
      const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',content.buffer));
      manifest.push({url:asset.url,path:name,status:'downloaded',bytes:content.length,sha256:[...digest].map(byte=>byte.toString(16).padStart(2,'0')).join(''),part});
      entries.push({name,bytes:content});bytes+=content.length;downloaded++;
      if(bytes>=PART_BYTES)flush();
    }catch(error){manifest.push({url:asset.url,path:name,status:'failed',error:error instanceof Error?error.message:'Fallo de red o CORS.'});}
  }
  const result={format:'gallery-backup/v1',exportedAt:new Date().toISOString(),complete:downloaded===assets.length,total:assets.length,downloaded,cancelled:options.signal.aborted,files:manifest,notes:'Partes ZIP independientes. SHA256 corresponde a los bytes descargados. Las URLs permiten recuperar archivos fallidos. No restaura ni modifica Firebase.'};
  entries.push(jsonEntry('manifiesto.json',result)); if (!entries.some(item=>item.name==='recuerdos-visibles.json')) entries.push(jsonEntry('recuerdos-visibles.json',memories)); flush();
  return {complete:result.complete,downloaded,total:assets.length,parts:part-1,cancelled:result.cancelled};
}
