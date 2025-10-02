#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// 사용 가능한 서비스 목록
const availableServices = ['account', 'match', 'chat'];

// 명령행 인수에서 서비스 목록 추출
const args = process.argv.slice(2);
let services = [];

if (args.length === 0) {
  // 인수가 없으면 모든 서비스 실행
  services = availableServices;
} else {
  // 유효한 서비스만 필터링
  services = args.filter(service => availableServices.includes(service));
  
  if (services.length === 0) {
    console.error('❌ 유효하지 않은 서비스명입니다.');
    console.log('✅ 사용 가능한 서비스:', availableServices.join(', '));
    console.log('📖 사용법: yarn dev [서비스명...]');
    console.log('📖 예시: yarn dev account match');
    process.exit(1);
  }
}

console.log(`🚀 다음 서비스들을 개발 모드로 시작합니다: ${services.join(', ')}`);

// concurrently 명령어 구성
const concurrentlyCommands = services.map(service => 
  `"yarn workspace ${service} start:dev"`
);

const concurrentlyArgs = [
  ...concurrentlyCommands,
  '--names', services.join(','),
  '--prefix-colors', 'cyan,magenta,yellow',
  '--kill-others-on-fail'
];

// concurrently 실행
const child = spawn('npx', ['concurrently', ...concurrentlyArgs], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..')
});

child.on('exit', (code) => {
  process.exit(code);
});

// Ctrl+C 처리
process.on('SIGINT', () => {
  console.log('\n👋 서비스들을 종료합니다...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});