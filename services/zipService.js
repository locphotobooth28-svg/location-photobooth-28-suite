const { PassThrough } = require("stream");

const CRC_TABLE=(()=>{
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
    table[n]=c>>>0;
  }
  return table;
})();

function crc32(buffer){
  let c=0xffffffff;
  for(const b of buffer)c=CRC_TABLE[(c^b)&0xff]^(c>>>8);
  return (c^0xffffffff)>>>0;
}
function safeZipName(value,index){
  const raw=String(value||`photo-${index+1}`).replace(/\\/g,"/").split("/").pop();
  const clean=raw.replace(/[\x00-\x1f<>:"|?*]/g,"_").trim();
  return clean||`photo-${index+1}`;
}
function dosDateTime(dateValue){
  const d=new Date(dateValue||Date.now());
  const year=Math.max(1980,d.getFullYear());
  const dosTime=((d.getHours()&31)<<11)|((d.getMinutes()&63)<<5)|((Math.floor(d.getSeconds()/2))&31);
  const dosDate=(((year-1980)&127)<<9)|(((d.getMonth()+1)&15)<<5)|(d.getDate()&31);
  return {dosTime,dosDate};
}
function localHeader(name,size,crc,date){
  const n=Buffer.from(name,"utf8"),{dosTime,dosDate}=dosDateTime(date);
  const b=Buffer.alloc(30+n.length);
  b.writeUInt32LE(0x04034b50,0); b.writeUInt16LE(20,4); b.writeUInt16LE(0x0800,6); b.writeUInt16LE(0,8);
  b.writeUInt16LE(dosTime,10); b.writeUInt16LE(dosDate,12); b.writeUInt32LE(crc>>>0,14);
  b.writeUInt32LE(size>>>0,18); b.writeUInt32LE(size>>>0,22); b.writeUInt16LE(n.length,26); b.writeUInt16LE(0,28); n.copy(b,30);
  return b;
}
function centralHeader(name,size,crc,offset,date){
  const n=Buffer.from(name,"utf8"),{dosTime,dosDate}=dosDateTime(date);
  const b=Buffer.alloc(46+n.length);
  b.writeUInt32LE(0x02014b50,0); b.writeUInt16LE(20,4); b.writeUInt16LE(20,6); b.writeUInt16LE(0x0800,8); b.writeUInt16LE(0,10);
  b.writeUInt16LE(dosTime,12); b.writeUInt16LE(dosDate,14); b.writeUInt32LE(crc>>>0,16); b.writeUInt32LE(size>>>0,20); b.writeUInt32LE(size>>>0,24);
  b.writeUInt16LE(n.length,28); b.writeUInt16LE(0,30); b.writeUInt16LE(0,32); b.writeUInt16LE(0,34); b.writeUInt16LE(0,36); b.writeUInt32LE(0,38); b.writeUInt32LE(offset>>>0,42); n.copy(b,46);
  return b;
}
function endRecord(count,centralSize,centralOffset){
  const b=Buffer.alloc(22);
  b.writeUInt32LE(0x06054b50,0); b.writeUInt16LE(0,4); b.writeUInt16LE(0,6); b.writeUInt16LE(count,8); b.writeUInt16LE(count,10);
  b.writeUInt32LE(centralSize>>>0,12); b.writeUInt32LE(centralOffset>>>0,16); b.writeUInt16LE(0,20); return b;
}

async function buildZip(items,readBuffer){
  const out=new PassThrough();
  (async()=>{
    let offset=0;
    const central=[];
    for(let i=0;i<items.length;i++){
      const item=items[i];
      const data=await readBuffer(item);
      const name=safeZipName(item.originalName||item.fileName,i);
      const crc=crc32(data);
      const local=localHeader(name,data.length,crc,item.createdAt);
      out.write(local); out.write(data);
      central.push(centralHeader(name,data.length,crc,offset,item.createdAt));
      offset+=local.length+data.length;
    }
    const centralOffset=offset;
    let centralSize=0;
    for(const h of central){out.write(h);centralSize+=h.length;}
    out.end(endRecord(central.length,centralSize,centralOffset));
  })().catch(err=>out.destroy(err));
  return out;
}

module.exports={buildZip};
