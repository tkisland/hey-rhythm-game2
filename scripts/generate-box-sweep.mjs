import {writeFile} from 'node:fs/promises';
import {createServer} from 'vite';

// Run after changing createBoxSamples/createBoxSweepSamples to update the shipped waveform.
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom',optimizeDeps:{noDiscovery:true,entries:[]}});
try {
  const {createBoxSweepSamples}=await server.ssrLoadModule('/src/sound.ts');
  const samples=createBoxSweepSamples(48000),header=Buffer.alloc(44);
  header.write('RIFF');header.writeUInt32LE(36+samples.byteLength,4);header.write('WAVEfmt ',8);
  header.writeUInt32LE(16,16);header.writeUInt16LE(3,20);header.writeUInt16LE(1,22);
  header.writeUInt32LE(48000,24);header.writeUInt32LE(192000,28);header.writeUInt16LE(4,32);header.writeUInt16LE(32,34);
  header.write('data',36);header.writeUInt32LE(samples.byteLength,40);
  await writeFile('src/assets/box-sweep.wav',Buffer.concat([header,Buffer.from(samples.buffer,samples.byteOffset,samples.byteLength)]));
  console.log('Prepared the original 48kHz float box sweep without changing its waveform.');
} finally {await server.close();}
