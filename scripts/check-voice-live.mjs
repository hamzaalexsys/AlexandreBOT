import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://localhost:5173';
const parent = process.argv.includes('--parent');
const login = await fetch(`${base}/api/session`, { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:parent?'parent':'student'}) });
assert.equal(login.status,200,'voice session');
const cookie = login.headers.get('set-cookie').split(';')[0];
function wav(pcm) {
  const bytes=Buffer.alloc(44+pcm.length);
  bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(24000,24);bytes.writeUInt32LE(48000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(pcm.length,40);pcm.copy(bytes,44);
  return new Blob([bytes],{type:'audio/wav'});
}
const samples = [
  {lang:'fr',text:'Bonjour Alexandre. Je suis Hamza et mon frère s’appelle Fahd. Peux-tu me présenter les résultats scolaires de mon enfant ?',names:[/Hamza/i,/Fahd/i]},
  {lang:'ar',text:'مرحباً ألكسندر. أنا حمزة وأخي اسمه فهد. كيف هي نتائج ابني في المدرسة؟',names:[/حمزة/,/فهد/]},
];
let question;
for (const sample of samples) {
  const began = performance.now();
  const r = await fetch(`${base}/api/speech`,{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({text:sample.text,lang:sample.lang}),signal:AbortSignal.timeout(35000)});
  assert.equal(r.status,200,`speech ${sample.lang}`);
  assert.match(r.headers.get('content-type'),/audio\/pcm/);
  const reader = r.body.getReader();
  const chunks=[]; let firstAudioMs;
  while(true){const {value,done}=await reader.read();if(done)break;firstAudioMs??=Math.round(performance.now()-began);chunks.push(Buffer.from(value));}
  const pcm=Buffer.concat(chunks);
  assert.ok(pcm.length>1000);
  const form=new FormData();form.append('audio',wav(pcm),'voice.wav');form.append('lang',sample.lang);
  const start=performance.now();
  const result=await fetch(`${base}/api/transcribe`,{method:'POST',headers:{cookie},body:form,signal:AbortSignal.timeout(16000)});
  assert.equal(result.status,200,`transcribe ${sample.lang}`);
  const data=await result.json();
  for(const name of sample.names)assert.match(data.text,name);
  console.log(JSON.stringify({lang:sample.lang,firstAudioMs,audioSeconds:pcm.length/48000,transcriptionMs:Math.round(performance.now()-start),model:data.model,text:data.text}));
  if(sample.lang==='fr')question=data.text;
}
if(parent){
  const started=performance.now();
  const r=await fetch(`${base}/api/chat`,{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({message:question,lang:'fr',age:9,history:[]}),signal:AbortSignal.timeout(90000)});
  assert.equal(r.status,200,'parent response');
  const data=await r.json();assert.ok(data.message?.length>10);
  const responseMs=Math.round(performance.now()-started);
  const voice=await fetch(`${base}/api/speech`,{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({text:data.message,lang:'fr'}),signal:AbortSignal.timeout(35000)});
  assert.equal(voice.status,200,'speak actual parent response');
  const reader=voice.body.getReader();const first=await reader.read();assert.ok(first.value?.length);await reader.cancel();
  console.log(JSON.stringify({parentResponseMs:responseMs,replyFirstAudioMs:Math.round(performance.now()-started)-responseMs,source:data.source,tools:data.toolNames,replyCharacters:data.message.length}));
}
console.log('PASS live voice: real OpenRouter speech and transcription, French/Arabic, Fahd/Hamza'+(parent?', parent school response and spoken reply':''));
