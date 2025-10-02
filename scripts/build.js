#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// 사용 가능한 서비스 목록
const availableServices = ['account', 'match', 'chat'];

// 명령행 인수에서 서비스 목록 추출
const args = process.argv.slice(2);
let services = [];
let isParallel = false;

// --parallel 플래그 확인
if (args.includes('--parallel')) {
  isParallel = true;
  args.splice(args.indexOf('--parallel'), 1);
}

if (args.length === 0) {
  // 인수가 없으면 모든 서비스 빌드
  services = availableServices;
} else {
  // 유효한 서비스만 필터링
  services = args.filter(service => availableServices.includes(service));
  
  if (services.length === 0) {
    console.error('❌ 유효하지 않은 서비스명입니다.');
    console.log('✅ 사용 가능한 서비스:', availableServices.join(', '));
    console.log('📖 사용법: yarn build [서비스명...] [--parallel]');
    console.log('📖 예시: yarn build account match --parallel');
    process.exit(1);
  }
}

const mode = isParallel ? '병렬' : '순차';
console.log(`🏗️ 다음 서비스들을 ${mode}로 빌드합니다: ${services.join(', ')}`);

if (isParallel) {
  // 병렬 빌드
  const concurrentlyCommands = services.map(service => 
    `"yarn workspace ${service} build"`
  );

  const concurrentlyArgs = [
    ...concurrentlyCommands,
    '--names', services.join(','),
    '--prefix-colors', 'cyan,magenta,yellow',
    '--kill-others-on-fail'
  ];

  const child = spawn('npx', ['concurrently', ...concurrentlyArgs], {
    stdio: 'inherit',
    shell: true,
    cwd: path.resolve(__dirname, '..')
  });

  child.on('exit', (code) => {
    process.exit(code);
  });
} else {
  // 순차 빌드
  async function buildSequentially() {
    for (const service of services) {
      console.log(`\n🔨 Building ${service}...`);
      
      const child = spawn('yarn', ['workspace', service, 'build'], {
        stdio: 'inherit',
        shell: true,
        cwd: path.resolve(__dirname, '..')
      });

      await new Promise((resolve, reject) => {
        child.on('exit', (code) => {
          if (code === 0) {
            console.log(`✅ ${service} 빌드 완료`);
            resolve();
          } else {
            console.error(`❌ ${service} 빌드 실패`);
            reject(new Error(`Build failed for ${service}`));
          }
        });
      });
    }
    console.log('\n🎉 모든 서비스 빌드가 완료되었습니다!');
  }

  buildSequentially().catch((error) => {
    console.error('\n💥 빌드 과정에서 오류가 발생했습니다:', error.message);
    process.exit(1);
  });
}