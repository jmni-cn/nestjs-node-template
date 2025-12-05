#!/usr/bin/env node
/**
 * 数据库检查和创建脚本
 * 检查MySQL数据库是否存在，不存在则创建
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

/**
 * 加载环境变量
 */
function loadEnvVars() {
  const envPath = path.join(process.cwd(), 'env', 'app.development.env');
  
  if (!fs.existsSync(envPath)) {
    log('❌ 环境配置文件不存在: env/app.development.env', 'red');
    log('💡 请先运行: npm run check', 'yellow');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return envVars;
}

/**
 * 检查MySQL连接
 */
async function checkMySQLConnection(config) {
  log('\n🔌 检查MySQL连接...', 'blue');
  
  try {
    const connection = await mysql.createConnection({
      host: config.MYSQL_HOST,
      port: parseInt(config.MYSQL_PORT || '3306'),
      user: config.MYSQL_USER,
      password: config.MYSQL_PASSWORD,
      connectTimeout: 10000, // 10秒超时
    });
    
    log('✅ MySQL连接成功', 'green');
    log(`   主机: ${config.MYSQL_HOST}:${config.MYSQL_PORT}`, 'cyan');
    log(`   用户: ${config.MYSQL_USER}`, 'cyan');
    
    return connection;
  } catch (error) {
    log('❌ MySQL连接失败', 'red');
    log(`   错误: ${error.message}`, 'red');
    
    if (error.code === 'ECONNREFUSED') {
      log('💡 请确保MySQL服务已启动', 'yellow');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('💡 请检查用户名和密码是否正确', 'yellow');
    } else if (error.code === 'ETIMEDOUT') {
      log('💡 请检查网络连接和防火墙设置', 'yellow');
    }
    
    throw error;
  }
}

/**
 * 检查数据库是否存在
 */
async function checkDatabaseExists(connection, dbName) {
  log('\n🔍 检查数据库是否存在...', 'blue');
  
  try {
    const [databases] = await connection.query(
      'SHOW DATABASES LIKE ?',
      [dbName]
    );
    
    return databases.length > 0;
  } catch (error) {
    log(`❌ 查询数据库失败: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * 创建数据库
 */
async function createDatabase(connection, dbName, charset, collation) {
  log('\n🔨 创建数据库...', 'blue');
  
  try {
    // 创建数据库
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` 
       CHARACTER SET ${charset} 
       COLLATE ${collation}`
    );
    
    log(`✅ 数据库创建成功: ${dbName}`, 'green');
    log(`   字符集: ${charset}`, 'cyan');
    log(`   排序规则: ${collation}`, 'cyan');
    
    return true;
  } catch (error) {
    log(`❌ 创建数据库失败: ${error.message}`, 'red');
    
    if (error.code === 'ER_DBACCESS_DENIED_ERROR') {
      log('💡 用户没有创建数据库的权限', 'yellow');
      log('💡 请使用具有CREATE权限的用户，或手动创建数据库', 'yellow');
    }
    
    throw error;
  }
}

/**
 * 检查数据库字符集和排序规则
 */
async function checkDatabaseCharset(connection, dbName, expectedCharset, expectedCollation) {
  log('\n🔍 检查数据库字符集...', 'blue');
  
  try {
    const [rows] = await connection.query(
      `SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME 
       FROM information_schema.SCHEMATA 
       WHERE SCHEMA_NAME = ?`,
      [dbName]
    );
    
    if (rows.length === 0) {
      log('⚠️  无法获取数据库字符集信息', 'yellow');
      return false;
    }
    
    const actualCharset = rows[0].DEFAULT_CHARACTER_SET_NAME;
    const actualCollation = rows[0].DEFAULT_COLLATION_NAME;
    
    if (actualCharset !== expectedCharset || actualCollation !== expectedCollation) {
      log('⚠️  数据库字符集不匹配', 'yellow');
      log(`   期望: ${expectedCharset} / ${expectedCollation}`, 'cyan');
      log(`   实际: ${actualCharset} / ${actualCollation}`, 'cyan');
      log('💡 建议重新创建数据库或手动修改字符集', 'yellow');
      return false;
    }
    
    log('✅ 数据库字符集正确', 'green');
    log(`   字符集: ${actualCharset}`, 'cyan');
    log(`   排序规则: ${actualCollation}`, 'cyan');
    
    return true;
  } catch (error) {
    log(`❌ 检查字符集失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 测试数据库访问权限
 */
async function testDatabaseAccess(connection, dbName) {
  log('\n🔐 测试数据库访问权限...', 'blue');
  
  try {
    // 切换到目标数据库
    await connection.query(`USE \`${dbName}\``);
    
    // 测试创建表权限
    await connection.query(
      `CREATE TABLE IF NOT EXISTS _health_check (
        id INT PRIMARY KEY AUTO_INCREMENT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    
    // 测试插入权限
    await connection.query(
      'INSERT INTO _health_check VALUES (DEFAULT, DEFAULT)'
    );
    
    // 测试查询权限
    const [rows] = await connection.query(
      'SELECT COUNT(*) as count FROM _health_check'
    );
    
    // 测试删除权限
    await connection.query('DELETE FROM _health_check');
    
    // 清理测试表
    await connection.query('DROP TABLE IF EXISTS _health_check');
    
    log('✅ 数据库访问权限正常', 'green');
    log('   ✓ CREATE 权限', 'cyan');
    log('   ✓ INSERT 权限', 'cyan');
    log('   ✓ SELECT 权限', 'cyan');
    log('   ✓ DELETE 权限', 'cyan');
    log('   ✓ DROP 权限', 'cyan');
    
    return true;
  } catch (error) {
    log('❌ 数据库访问权限不足', 'red');
    log(`   错误: ${error.message}`, 'red');
    
    if (error.code === 'ER_DBACCESS_DENIED_ERROR') {
      log('💡 用户没有访问该数据库的权限', 'yellow');
    } else if (error.code === 'ER_TABLEACCESS_DENIED_ERROR') {
      log('💡 用户没有操作表的权限', 'yellow');
    }
    
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  log('\n╔════════════════════════════════════╗', 'blue');
  log('║   MySQL 数据库检查工具             ║', 'blue');
  log('╚════════════════════════════════════╝', 'blue');
  
  let connection = null;
  
  try {
    // 1. 加载环境变量
    const envVars = loadEnvVars();
    
    const dbConfig = {
      MYSQL_HOST: envVars.MYSQL_HOST,
      MYSQL_PORT: envVars.MYSQL_PORT,
      MYSQL_USER: envVars.MYSQL_USER,
      MYSQL_PASSWORD: envVars.MYSQL_PASSWORD,
      MYSQL_DB: envVars.MYSQL_DB,
      MYSQL_CHARSET: envVars.MYSQL_CHARSET || 'utf8mb4',
      MYSQL_COLLATION: envVars.MYSQL_COLLATION || 'utf8mb4_0900_ai_ci',
    };
    
    // 验证必需配置
    const requiredFields = ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DB'];
    const missingFields = requiredFields.filter(field => !dbConfig[field]);
    
    if (missingFields.length > 0) {
      log('\n❌ 缺少必需的数据库配置:', 'red');
      missingFields.forEach(field => log(`   - ${field}`, 'red'));
      process.exit(1);
    }
    
    log(`\n📋 数据库配置:`, 'cyan');
    log(`   数据库名: ${dbConfig.MYSQL_DB}`, 'cyan');
    log(`   主机: ${dbConfig.MYSQL_HOST}:${dbConfig.MYSQL_PORT}`, 'cyan');
    log(`   用户: ${dbConfig.MYSQL_USER}`, 'cyan');
    
    // 2. 连接MySQL
    connection = await checkMySQLConnection(dbConfig);
    
    // 3. 检查数据库是否存在
    const dbExists = await checkDatabaseExists(connection, dbConfig.MYSQL_DB);
    
    if (dbExists) {
      log(`✅ 数据库已存在: ${dbConfig.MYSQL_DB}`, 'green');
      
      // 检查字符集
      await checkDatabaseCharset(
        connection,
        dbConfig.MYSQL_DB,
        dbConfig.MYSQL_CHARSET,
        dbConfig.MYSQL_COLLATION
      );
    } else {
      log(`⚠️  数据库不存在: ${dbConfig.MYSQL_DB}`, 'yellow');
      
      // 创建数据库
      await createDatabase(
        connection,
        dbConfig.MYSQL_DB,
        dbConfig.MYSQL_CHARSET,
        dbConfig.MYSQL_COLLATION
      );
    }
    
    // 4. 测试数据库访问权限
    await testDatabaseAccess(connection, dbConfig.MYSQL_DB);
    
    // 5. 成功
    log('\n' + '═'.repeat(40), 'blue');
    log('✅ 数据库检查完成！所有检查通过', 'green');
    log('\n💡 提示:', 'cyan');
    log('   - 现在可以运行数据库迁移: npm run migration:run', 'cyan');
    log('   - 或者运行种子数据: npm run seed', 'cyan');
    
    process.exit(0);
    
  } catch (error) {
    log('\n' + '═'.repeat(40), 'blue');
    log('❌ 数据库检查失败', 'red');
    log(`\n错误详情: ${error.message}`, 'red');
    
    if (error.stack) {
      log('\n堆栈跟踪:', 'yellow');
      console.log(error.stack);
    }
    
    process.exit(1);
  } finally {
    // 关闭连接
    if (connection) {
      try {
        await connection.end();
        log('\n🔌 数据库连接已关闭', 'cyan');
      } catch (error) {
        // 忽略关闭错误
      }
    }
  }
}

// 运行主函数
main().catch(error => {
  log(`\n❌ 发生未捕获的错误: ${error.message}`, 'red');
  process.exit(1);
});

