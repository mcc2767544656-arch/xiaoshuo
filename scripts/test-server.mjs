import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/index.mjs';
const dataDir=await mkdtemp(join(tmpdir(),'qidu-browser-'));
const {server}=await createApp({dataDir,password:'browser-test-qidu-password',production:false});
server.listen(4181,'127.0.0.1');
for (const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>{server.close(async()=>{await rm(dataDir,{recursive:true,force:true});process.exit(0);});server.closeAllConnections();});
