import { spawn } from 'node:child_process';

const env = { ...process.env, VITE_API_URL: 'http://localhost:8790', VITE_MOCK_AUTH: '1' };
const run = (cmd, args) => spawn(cmd, args, { stdio: 'inherit', env });
const kids = [run('node', ['mock/server.mjs']), run('npx', ['vite'])];
const stop = () => kids.forEach((k) => k.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
kids.forEach((k) => k.on('exit', stop));
