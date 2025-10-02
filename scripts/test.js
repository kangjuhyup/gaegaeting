#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// 사용 가능한 서비스 목록
const availableServices = ['account', 'match', 'chat'];

// 명령행 인수에서 서비스 목록 추출
const args = process.argv.slice(2);
let services = [];
let isParallel = false;
let isWatch = false;

// 플래그 확인
if (args.includes('--parallel')) {
  isParallel = true;
  args.splice(args.indexOf('--parallel'), 1);
}

if (args.includes('--watch')) {
  isWatch = true;
  args.splice(args.indexOf('--watch'), 1);
}

if (args.length === 0) {
  // 인수가 없으면 모든 서비스 테스트
  services = availableServices;
} else {
  // 유효한 서비스만 필터링
  services = args.filter(service => availableServices.includes(service));
  
  if (services.length === 0) {
    console.error('❌ 유효하지 않은 서비스명입니다.');
    console.log('✅ 사용 가능한 서비스:', availableServices.join(', '));
    console.log('📖 사용법: yarn test [서비스명...] [--parallel] [--watch]');
    console.log('📖 예시: yarn test account match --parallel');
    process.exit(1);
  }
}

const mode = isParallel ? '병렬' : '순차';
const watchMode = isWatch ? ' (watch 모드)' : '';
console.log(`🧪 다음 서비스들을 ${mode}로 테스트합니다${watchMode}: ${services.join(', ')}`);

const testCommand = isWatch ? 'test:watch' : 'test';

if (isParallel) {
  // 병렬 테스트
  const concurrentlyCommands = services.map(service => 
    `"yarn workspace ${service} ${testCommand}"`
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
  // 순차 테스트 (watch 모드는 병렬만 지원)
  if (isWatch) {
    console.error('❌ watch 모드는 --parallel과 함께 사용해야 합니다.');
    process.exit(1);
  }

  async function testSequentially() {
    for (const service of services) {
      console.log(`\n🧪 Testing ${service}...`);
      
      const child = spawn('yarn', ['workspace', service, 'test'], {
        stdio: 'inherit',
        shell: true,
        cwd: path.resolve(__dirname, '..')
      });

      await new Promise((resolve, reject) => {
        child.on('exit', (code) => {
          if (code === 0) {
            console.log(`✅ ${service} 테스트 완료`);
            resolve();
          } else {
            console.error(`❌ ${service} 테스트 실패`);
            reject(new Error(`Test failed for ${service}`));
          }
        });
      });
    }
    console.log('\n🎉 모든 서비스 테스트가 완료되었습니다!');
  }

  testSequentially().catch((error) => {
    console.error('\n💥 테스트 과정에서 오류가 발생했습니다:', error.message);
    process.exit(1);
  });
}