// Deterministic data transport, never code. Integers are safe varints, ordinary
// numbers remain IEEE-754 doubles, strings must round-trip through UTF-8.
const MAX_BYTES=64*1024*1024,MAX_ITEMS=250000,MAX_DEPTH=80,MAX_NODES=8000000;
export function writePackedBinary(value:unknown):Buffer{
 let buffer=Buffer.allocUnsafe(65536),offset=0,nodes=0;
 function ensure(size:number){if(offset+size>MAX_BYTES)throw Error('Packed binary exceeds byte bound');if(offset+size>buffer.length){const next=Buffer.allocUnsafe(Math.min(MAX_BYTES,Math.max(offset+size,buffer.length*2)));buffer.copy(next,0,0,offset);buffer=next;}}
 function byte(n:number){ensure(1);buffer[offset++]=n;}
 function uint(n:number){if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid packed unsigned integer');do{const low=n%128;n=Math.floor(n/128);byte(low+(n?128:0));}while(n);}
 function write(v:unknown,depth=0):void{
  if(depth>MAX_DEPTH||++nodes>MAX_NODES)throw Error('Packed binary nesting/node bound');
  if(v===null){byte(0);return;}if(v===false){byte(1);return;}if(v===true){byte(2);return;}
  if(typeof v==='number'){
   if(!Number.isFinite(v))throw Error('Non-finite packed number');
   if(Number.isSafeInteger(v)){byte(v<0?4:3);uint(Math.abs(v));}else{byte(5);ensure(8);buffer.writeDoubleLE(v,offset);offset+=8;}return;
  }
  if(typeof v==='string'){
   const bytes=Buffer.from(v,'utf8');if(bytes.toString('utf8')!==v)throw Error('Packed string is not canonical UTF-8');
   byte(6);uint(bytes.length);ensure(bytes.length);bytes.copy(buffer,offset);offset+=bytes.length;return;
  }
  if(Array.isArray(v)){
   if(v.length>MAX_ITEMS)throw Error('Packed array exceeds item bound');
   const integers=v.length>0&&v.every(n=>typeof n==='number'&&Number.isSafeInteger(n)&&Math.abs(n)<=Math.floor(Number.MAX_SAFE_INTEGER/2));
   byte(integers?9:7);uint(v.length);
   if(integers){if(nodes+v.length>MAX_NODES)throw Error('Packed node bound');nodes+=v.length;for(const n of v as number[])uint(n<0?-2*n-1:2*n);}
   else for(const item of v)write(item,depth+1);return;
  }
  if(v&&typeof v==='object'){
   const entries=Object.entries(v);if(entries.length>MAX_ITEMS)throw Error('Packed object exceeds item bound');byte(8);uint(entries.length);
   for(const [key,item]of entries){write(key,depth+1);write(item,depth+1);}return;
  }
  throw Error('Unsupported packed binary value');
 }
 write(value);return buffer.subarray(0,offset);
}

export function readPackedBinary(bytes:Uint8Array):unknown{
 if(bytes.length>MAX_BYTES)throw Error('Packed binary exceeds byte bound');
 let offset=0,nodes=0;const decoder=new TextDecoder('utf-8',{fatal:true}),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 function byte(){if(offset>=bytes.length)throw Error('Truncated packed binary');return bytes[offset++]!;}
 function uint(){let value=0,factor=1,count=0,b:number;do{b=byte();if(++count>8)throw Error('Packed varint overflow');value+=(b%128)*factor;factor*=128;if(!Number.isSafeInteger(value))throw Error('Packed varint overflow');}while(b>=128);if(count>1&&b===0)throw Error('Noncanonical packed varint');return value;}
 function length(){const n=uint();if(n>MAX_ITEMS||n>bytes.length-offset)throw Error('Packed collection length bound');return n;}
 function read(depth=0):unknown{
  if(depth>MAX_DEPTH||++nodes>MAX_NODES)throw Error('Packed binary nesting/node bound');const tag=byte();
  if(tag===0)return null;if(tag===1)return false;if(tag===2)return true;
  if(tag===3||tag===4){const n=uint();if(tag===4&&n===0)throw Error('Noncanonical packed negative zero');return tag===4?-n:n;}
  if(tag===5){if(offset+8>bytes.length)throw Error('Truncated packed double');const n=view.getFloat64(offset,true);offset+=8;if(!Number.isFinite(n))throw Error('Non-finite packed double');return n;}
  if(tag===6){const n=uint();if(n>bytes.length-offset)throw Error('Truncated packed string');const s=decoder.decode(bytes.subarray(offset,offset+n));offset+=n;return s;}
  if(tag===7||tag===9){const n=length(),out:unknown[]=[];if(tag===9&&nodes+n>MAX_NODES)throw Error('Packed node bound');
   for(let i=0;i<n;i++){if(tag===9){const v=uint();out.push(v%2?-(v+1)/2:v/2);nodes++;}else out.push(read(depth+1));}return out;}
  if(tag===8){const n=length(),out:Record<string,unknown>=Object.create(null);for(let i=0;i<n;i++){const key=read(depth+1);if(typeof key!=='string'||Object.hasOwn(out,key))throw Error('Invalid packed binary key');out[key]=read(depth+1);}return out;}
  throw Error('Unknown packed binary tag');
 }
 const value=read();if(offset!==bytes.length)throw Error('Trailing packed binary bytes');return value;
}

// Literal bytes are stable between tsx and the built CLI. Server validation
// independently parses the same data before this fixed browser reader is allowed.
export const PACKED_BINARY_DECODER_SOURCE=`function readBinary(bytes){
if(bytes.length>67108864)throw Error("Packed byte bound");let at=0,nodes=0;const decoder=new TextDecoder("utf-8",{fatal:true}),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
function byte(){if(at>=bytes.length)throw Error("Truncated packed binary");return bytes[at++];}
function uint(){let n=0,factor=1,count=0,b;do{b=byte();if(++count>8)throw Error("Packed varint overflow");n+=(b%128)*factor;factor*=128;if(!Number.isSafeInteger(n))throw Error("Packed varint overflow");}while(b>=128);if(count>1&&b===0)throw Error("Noncanonical packed varint");return n;}
function length(){const n=uint();if(n>250000||n>bytes.length-at)throw Error("Packed length bound");return n;}
function read(depth=0){if(depth>80||++nodes>8000000)throw Error("Packed nesting/node bound");const tag=byte();if(tag===0)return null;if(tag===1)return false;if(tag===2)return true;
if(tag===3||tag===4){const n=uint();if(tag===4&&n===0)throw Error("Packed negative zero");return tag===4?-n:n;}
if(tag===5){if(at+8>bytes.length)throw Error("Truncated packed double");const n=view.getFloat64(at,true);at+=8;if(!Number.isFinite(n))throw Error("Non-finite packed double");return n;}
if(tag===6){const n=uint();if(n>bytes.length-at)throw Error("Truncated packed string");const s=decoder.decode(bytes.subarray(at,at+n));at+=n;return s;}
if(tag===7||tag===9){const n=length(),out=[];if(tag===9&&nodes+n>8000000)throw Error("Packed node bound");for(let i=0;i<n;i++){if(tag===9){const v=uint();out.push(v%2?-(v+1)/2:v/2);nodes++;}else out.push(read(depth+1));}return out;}
if(tag===8){const n=length(),out=Object.create(null);for(let i=0;i<n;i++){const k=read(depth+1);if(typeof k!=="string"||Object.hasOwn(out,k))throw Error("Invalid packed key");out[k]=read(depth+1);}return out;}throw Error("Unknown packed tag");}
const p=read();if(at!==bytes.length)throw Error("Trailing packed bytes");return p;}`;
