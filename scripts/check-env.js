#!/usr/bin/env node
/**
 * 环境检查脚本
 * 在服务启动前检查所有必要的环境配置
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkEnvFile() {
  log('\n📝 检查环境配置文件...', 'blue');
  
  const envPath = path.join(process.cwd(), 'env', 'app.development.env');
  
  if (!fs.existsSync(envPath)) {
    log('❌ 环境配置文件不存在: env/app.development.env', 'red');
    log('💡 请复制 env/example.env 并重命名为 env/app.development.env', 'yellow');
    return false;
  }
  
  log('✅ 环境配置文件存在', 'green');
  return true;
}

function checkNodeVersion() {
  log('\n🔍 检查 Node.js 版本...', 'blue');
  
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    log(`❌ Node.js 版本过低: ${nodeVersion} (需要 >= 18.x)`, 'red');
    return false;
  }
  
  log(`✅ Node.js 版本: ${nodeVersion}`, 'green');
  return true;
}

function checkDependencies() {
  log('\n📦 检查依赖安装...', 'blue');
  
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    log('❌ 依赖未安装', 'red');
    log('💡 请运行: npm install', 'yellow');
    return false;
  }
  
  log('✅ 依赖已安装', 'green');
  return true;
}

function checkRequiredEnvVars() {
  log('\n🔑 检查必需的环境变量...', 'blue');
  
  // 加载环境变量
  const envPath = path.join(process.cwd(), 'env', 'app.development.env');
  if (!fs.existsSync(envPath)) {
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      envVars[key] = valueParts.join('=');
    }
  });
  
  const requiredVars = [
    'MYSQL_HOST',
    'MYSQL_PORT',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_DB',
    'REDIS_HOST',
    'REDIS_PORT',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    if (!envVars[varName] || envVars[varName].trim() === '') {
      log(`❌ 缺少环境变量: ${varName}`, 'red');
      allPresent = false;
    }
  });
  
  if (allPresent) {
    log('✅ 所有必需的环境变量已配置', 'green');
  }
  
  return allPresent;
}

function checkPorts() {
  log('\n🔌 检查端口配置...', 'blue');
  
  const net = require('net');
  const port = process.env.APP_PORT || 2233;
  
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        log(`⚠️  端口 ${port} 已被占用`, 'yellow');
        log('💡 请修改 APP_PORT 配置或停止占用该端口的进程', 'yellow');
        resolve(false);
      } else {
        resolve(true);
      }
    });
    
    server.once('listening', () => {
      server.close();
      log(`✅ 端口 ${port} 可用`, 'green');
      resolve(true);
    });
    
    server.listen(port);
  });
}

async function main() {
  log('\n╔════════════════════════════════════╗', 'blue');
  log('║   JMNI Server 环境检查工具         ║', 'blue');
  log('╚════════════════════════════════════╝', 'blue');
  
  const checks = [
    checkNodeVersion(),
    checkDependencies(),
    checkEnvFile(),
    checkRequiredEnvVars(),
    await checkPorts(),
  ];
  
  const allPassed = checks.every(result => result);
  
  log('\n' + '═'.repeat(40), 'blue');
  
  if (allPassed) {
    log('✅ 所有检查通过！可以启动服务', 'green');
    process.exit(0);
  } else {
    log('❌ 部分检查失败，请修复后再启动服务', 'red');
    process.exit(1);
  }
}

main().catch(err => {
  log(`\n❌ 检查过程出错: ${err.message}`, 'red');
  process.exit(1);
});

