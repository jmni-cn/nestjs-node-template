/**
 * API 文档生成脚本
 *
 * 功能：
 * - 从 NestJS Swagger 装饰器提取 OpenAPI 规范
 * - 生成 Markdown 格式的 API 文档
 * - 生成独立的 HTML 文档（基于 Swagger UI）
 * - 输出到 /docs/api 目录
 *
 * 使用方法：
 *   npm run doc:gen
 *
 * 输出文件：
 *   - docs/api/openapi.json     - OpenAPI 3.0 规范 JSON
 *   - docs/api/api.md           - Markdown 格式文档
 *   - docs/api/index.html       - 独立 HTML 文档（Swagger UI）
 *
 * @author JMNI Server
 * @version 1.0.0
 */

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import * as fs from 'fs';
import * as path from 'path';

// 需要动态导入 AppModule
async function main() {
  console.log('📚 开始生成 API 文档...\n');

  // 1. 创建 NestJS 应用（不监听端口）
  console.log('🔧 初始化 NestJS 应用...');

  // 动态导入 AppModule
  const { AppModule } = await import('../src/app.module');
  const packageJson = await import('../package.json');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { logger: false }, // 禁用启动日志
  );

  // 2. 构建 Swagger 文档配置
  console.log('📝 构建 OpenAPI 规范...');
  const config = new DocumentBuilder()
    .setTitle(packageJson.name || 'JMNI Server')
    .setDescription(
      packageJson.description || 'JMNI Server API 文档 - 供外部团队参考',
    )
    .setVersion(packageJson.version || '1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Access Token',
      },
      'access-token',
    )
    .addServer('https://api.jmni.cn', '生产环境')
    .addServer('http://localhost:2233', '开发环境')
    .setContact('JMNI Team', 'https://jmni.cn', 'support@jmni.cn')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('auth', '用户认证 - 登录、注册、Token 管理')
    .addTag('users', '用户管理 - 用户信息查询和更新')
    .addTag('图片上传', '文件上传 - 图片上传和管理')
    .addTag('文章 - 用户端', '文章 - 公开文章读取')
    .addTag('问卷 - 用户端', '问卷 - 问卷获取和提交')
    .addTag('配置 - 用户端', '配置 - 应用配置获取')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // 3. 创建输出目录
  const outputDir = path.resolve(process.cwd(), 'docs/api');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 4. 输出 OpenAPI JSON
  const jsonPath = path.join(outputDir, 'openapi.json');
  fs.writeFileSync(jsonPath, JSON.stringify(document, null, 2), 'utf-8');
  console.log(`✅ OpenAPI JSON: ${jsonPath}`);

  // 5. 生成 Markdown 文档
  const markdownPath = path.join(outputDir, 'api.md');
  const markdown = generateMarkdown(document);
  fs.writeFileSync(markdownPath, markdown, 'utf-8');
  console.log(`✅ Markdown 文档: ${markdownPath}`);

  // 6. 生成 HTML 文档（Swagger UI）
  const htmlPath = path.join(outputDir, 'index.html');
  const html = generateSwaggerHtml(document, packageJson.name);
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`✅ HTML 文档: ${htmlPath}`);

  // 7. 关闭应用（忽略关闭时的数据库连接错误）
  try {
    await app.close();
  } catch {
    // 忽略关闭时的错误（如 TypeORM DataSource 未初始化等）
  }

  console.log('\n🎉 API 文档生成完成！');
  console.log(`📂 输出目录: ${outputDir}`);
  console.log('\n可用文件:');
  console.log('  - openapi.json  : OpenAPI 3.0 规范（可导入 Postman/Apifox）');
  console.log('  - api.md        : Markdown 格式（可在 GitHub/Notion 查看）');
  console.log('  - index.html    : 交互式 HTML 文档（直接在浏览器打开）');

  process.exit(0);
}

/**
 * 将 OpenAPI 文档转换为 Markdown 格式
 */
function generateMarkdown(doc: any): string {
  const lines: string[] = [];
  const timestamp = new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
  });

  // 标题和基本信息
  lines.push(`# ${doc.info.title} API 文档`);
  lines.push('');
  lines.push(`> 版本: ${doc.info.version}`);
  lines.push(`> 生成时间: ${timestamp}`);
  lines.push('');

  if (doc.info.description) {
    lines.push('## 简介');
    lines.push('');
    lines.push(doc.info.description);
    lines.push('');
  }

  // 服务器信息
  if (doc.servers && doc.servers.length > 0) {
    lines.push('## 服务器');
    lines.push('');
    lines.push('| 环境 | URL |');
    lines.push('|------|-----|');
    for (const server of doc.servers) {
      lines.push(`| ${server.description || '默认'} | \`${server.url}\` |`);
    }
    lines.push('');
  }

  // 认证信息
  if (doc.components?.securitySchemes) {
    lines.push('## 认证');
    lines.push('');
    lines.push('本 API 使用 JWT Bearer Token 认证。');
    lines.push('');
    lines.push('```http');
    lines.push('Authorization: Bearer <your_access_token>');
    lines.push('```');
    lines.push('');
  }

  // 按 Tag 分组的 API 列表
  lines.push('## API 概览');
  lines.push('');

  // 收集所有 paths 并按 tag 分组
  const pathsByTag: Record<string, any[]> = {};
  const untaggedPaths: any[] = [];

  for (const [pathUrl, methods] of Object.entries(doc.paths || {})) {
    for (const [method, operation] of Object.entries(methods as any)) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        const tags = (operation as any).tags || [];
        const pathInfo = {
          path: pathUrl,
          method: method.toUpperCase(),
          operation,
        };

        if (tags.length === 0) {
          untaggedPaths.push(pathInfo);
        } else {
          for (const tag of tags) {
            if (!pathsByTag[tag]) {
              pathsByTag[tag] = [];
            }
            pathsByTag[tag].push(pathInfo);
          }
        }
      }
    }
  }

  // 生成目录
  lines.push('### 目录');
  lines.push('');
  for (const tag of Object.keys(pathsByTag)) {
    const anchor = tag.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-');
    lines.push(`- [${tag}](#${anchor})`);
  }
  if (untaggedPaths.length > 0) {
    lines.push('- [其他](#其他)');
  }
  lines.push('');

  // 生成各 Tag 的 API 详情
  lines.push('---');
  lines.push('');
  lines.push('## API 详情');
  lines.push('');

  for (const [tag, paths] of Object.entries(pathsByTag)) {
    lines.push(`### ${tag}`);
    lines.push('');

    // 快速索引表
    lines.push('| 方法 | 路径 | 描述 |');
    lines.push('|------|------|------|');
    for (const { path: p, method, operation } of paths) {
      const summary = operation.summary || operation.operationId || '-';
      lines.push(`| \`${method}\` | \`${p}\` | ${summary} |`);
    }
    lines.push('');

    // 详细信息
    for (const { path: p, method, operation } of paths) {
      lines.push(`#### ${method} ${p}`);
      lines.push('');

      if (operation.summary) {
        lines.push(`**${operation.summary}**`);
        lines.push('');
      }

      if (operation.description) {
        lines.push(operation.description);
        lines.push('');
      }

      // 认证要求
      if (operation.security && operation.security.length > 0) {
        lines.push('🔐 **需要认证**');
        lines.push('');
      }

      // 请求参数
      const params = operation.parameters || [];
      if (params.length > 0) {
        lines.push('**请求参数**');
        lines.push('');
        lines.push('| 参数名 | 位置 | 类型 | 必填 | 描述 |');
        lines.push('|--------|------|------|------|------|');
        for (const param of params) {
          const required = param.required ? '是' : '否';
          const type = param.schema?.type || 'string';
          const desc = param.description || '-';
          lines.push(
            `| \`${param.name}\` | ${param.in} | ${type} | ${required} | ${desc} |`,
          );
        }
        lines.push('');
      }

      // 请求体
      if (operation.requestBody) {
        lines.push('**请求体**');
        lines.push('');

        const content = operation.requestBody.content;
        for (const [contentType, mediaType] of Object.entries(content || {})) {
          lines.push(`Content-Type: \`${contentType}\``);
          lines.push('');

          const schema = (mediaType as any).schema;
          if (schema) {
            lines.push('```json');
            lines.push(generateSchemaExample(schema, doc.components?.schemas));
            lines.push('```');
            lines.push('');

            // 字段说明
            const properties = resolveSchema(
              schema,
              doc.components?.schemas,
            )?.properties;
            if (properties && Object.keys(properties).length > 0) {
              lines.push('| 字段 | 类型 | 必填 | 描述 |');
              lines.push('|------|------|------|------|');
              const required =
                resolveSchema(schema, doc.components?.schemas)?.required || [];
              for (const [fieldName, fieldSchema] of Object.entries(
                properties,
              )) {
                const isRequired = required.includes(fieldName) ? '是' : '否';
                const fieldType = getFieldType(
                  fieldSchema as any,
                  doc.components?.schemas,
                );
                const fieldDesc = (fieldSchema as any).description || '-';
                lines.push(
                  `| \`${fieldName}\` | ${fieldType} | ${isRequired} | ${fieldDesc} |`,
                );
              }
              lines.push('');
            }
          }
        }
      }

      // 响应
      if (operation.responses) {
        lines.push('**响应**');
        lines.push('');

        for (const [statusCode, response] of Object.entries(
          operation.responses,
        )) {
          const resp = response as any;
          lines.push(`- **${statusCode}**: ${resp.description || ''}`);

          const content = resp.content;
          if (content?.['application/json']?.schema) {
            const schema = content['application/json'].schema;
            lines.push('');
            lines.push('```json');
            lines.push(generateSchemaExample(schema, doc.components?.schemas));
            lines.push('```');
          }
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }
  }

  // 未分组的 API
  if (untaggedPaths.length > 0) {
    lines.push('### 其他');
    lines.push('');
    lines.push('| 方法 | 路径 | 描述 |');
    lines.push('|------|------|------|');
    for (const { path: p, method, operation } of untaggedPaths) {
      const summary = operation.summary || operation.operationId || '-';
      lines.push(`| \`${method}\` | \`${p}\` | ${summary} |`);
    }
    lines.push('');
  }

  // 数据模型（Schemas）
  if (doc.components?.schemas && Object.keys(doc.components.schemas).length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## 数据模型');
    lines.push('');

    for (const [schemaName, schema] of Object.entries(doc.components.schemas)) {
      const s = schema as any;
      lines.push(`### ${schemaName}`);
      lines.push('');

      if (s.description) {
        lines.push(s.description);
        lines.push('');
      }

      if (s.properties) {
        lines.push('| 字段 | 类型 | 必填 | 描述 |');
        lines.push('|------|------|------|------|');
        const required = s.required || [];
        for (const [fieldName, fieldSchema] of Object.entries(s.properties)) {
          const isRequired = required.includes(fieldName) ? '是' : '否';
          const fieldType = getFieldType(
            fieldSchema as any,
            doc.components?.schemas,
          );
          const fieldDesc = (fieldSchema as any).description || '-';
          lines.push(
            `| \`${fieldName}\` | ${fieldType} | ${isRequired} | ${fieldDesc} |`,
          );
        }
        lines.push('');
      }
    }
  }

  // 页脚
  lines.push('---');
  lines.push('');
  lines.push(
    `*本文档由 JMNI Server 自动生成，生成时间: ${timestamp}*`,
  );

  return lines.join('\n');
}

/**
 * 解析 Schema 引用
 */
function resolveSchema(schema: any, schemas: any): any {
  if (!schema) return null;
  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '');
    return schemas?.[refName] || schema;
  }
  return schema;
}

/**
 * 获取字段类型描述
 */
function getFieldType(schema: any, schemas: any): string {
  if (!schema) return 'any';

  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '');
    return `[${refName}](#${refName.toLowerCase()})`;
  }

  if (schema.type === 'array') {
    const itemType = getFieldType(schema.items, schemas);
    return `${itemType}[]`;
  }

  if (schema.enum) {
    return `enum(${schema.enum.join('|')})`;
  }

  if (schema.format) {
    return `${schema.type}(${schema.format})`;
  }

  return schema.type || 'any';
}

/**
 * 根据 Schema 生成示例 JSON
 */
function generateSchemaExample(schema: any, schemas: any, depth = 0): string {
  if (depth > 5) return '"..."'; // 防止循环引用

  const resolved = resolveSchema(schema, schemas);
  if (!resolved) return '{}';

  if (resolved.example !== undefined) {
    return JSON.stringify(resolved.example, null, 2);
  }

  if (resolved.type === 'array') {
    const itemExample = generateSchemaExample(resolved.items, schemas, depth + 1);
    return `[\n  ${itemExample}\n]`;
  }

  if (resolved.type === 'object' || resolved.properties) {
    const example: any = {};
    for (const [key, prop] of Object.entries(resolved.properties || {})) {
      const p = prop as any;
      if (p.example !== undefined) {
        example[key] = p.example;
      } else if (p.$ref) {
        example[key] = JSON.parse(
          generateSchemaExample(p, schemas, depth + 1),
        );
      } else if (p.type === 'string') {
        example[key] = p.enum?.[0] || p.default || 'string';
      } else if (p.type === 'number' || p.type === 'integer') {
        example[key] = p.default || 0;
      } else if (p.type === 'boolean') {
        example[key] = p.default ?? true;
      } else if (p.type === 'array') {
        example[key] = [];
      } else if (p.type === 'object') {
        example[key] = {};
      } else {
        example[key] = null;
      }
    }
    return JSON.stringify(example, null, 2);
  }

  // 基本类型
  if (resolved.type === 'string') return `"${resolved.default || 'string'}"`;
  if (resolved.type === 'number' || resolved.type === 'integer')
    return String(resolved.default || 0);
  if (resolved.type === 'boolean') return String(resolved.default ?? true);

  return '{}';
}

/**
 * 生成独立的 Swagger UI HTML
 */
function generateSwaggerHtml(doc: any, title: string): string {
  const specJson = JSON.stringify(doc)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'API'} 文档</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    .swagger-ui .topbar {
      display: none;
    }
    .swagger-ui .info {
      margin: 20px 0;
    }
    .swagger-ui .info .title {
      font-size: 2em;
    }
    /* 自定义主题 */
    .swagger-ui .opblock.opblock-post {
      border-color: #49cc90;
      background: rgba(73, 204, 144, 0.1);
    }
    .swagger-ui .opblock.opblock-get {
      border-color: #61affe;
      background: rgba(97, 175, 254, 0.1);
    }
    .swagger-ui .opblock.opblock-delete {
      border-color: #f93e3e;
      background: rgba(249, 62, 62, 0.1);
    }
    .swagger-ui .opblock.opblock-put {
      border-color: #fca130;
      background: rgba(252, 161, 48, 0.1);
    }
    /* 生成信息 */
    .generated-info {
      text-align: center;
      padding: 10px;
      background: #f5f5f5;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <div class="generated-info">
    本文档由 JMNI Server 自动生成 | 
    生成时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
  </div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const spec = ${specJson};
      
      window.ui = SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: false, // 禁用 Try it out（外部文档不需要）
        persistAuthorization: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
      });
    };
  </script>
</body>
</html>`;
}

// 运行主函数
main().catch((error) => {
  console.error('❌ 文档生成失败:', error);
  process.exit(1);
});

