# jmni-server API 文档

> 版本: 0.0.1
> 生成时间: 2025/12/5 11:11:45

## 简介

JMNI Server API 文档 - 供外部团队参考

## 服务器

| 环境 | URL |
|------|-----|
| 生产环境 | `https://api.jmni.cn` |
| 开发环境 | `http://localhost:2233` |

## 认证

本 API 使用 JWT Bearer Token 认证。

```http
Authorization: Bearer <your_access_token>
```

## API 概览

### 目录

- [Security - 安全管理](#security---安全管理)
- [Database Monitor - 数据库监控](#database-monitor---数据库监控)
- [security](#security)
- [Monitoring - 系统监控](#monitoring---系统监控)
- [auth](#auth)
- [Auth Security](#auth-security)
- [users](#users)
- [auth/oauth](#auth-oauth)
- [图片上传](#图片上传)
- [文章 - 用户端](#文章---用户端)
- [问卷 - 用户端](#问卷---用户端)
- [配置 - 用户端](#配置---用户端)
- [admin-auth](#admin-auth)
- [admin-users](#admin-users)
- [admin-roles](#admin-roles)
- [admin-permissions](#admin-permissions)
- [admin-credentials](#admin-credentials)
- [admin-operation-log](#admin-operation-log)
- [admin-article](#admin-article)
- [模块配置管理](#模块配置管理)
- [问卷管理](#问卷管理)
- [分类管理](#分类管理)
- [问卷响应 - 用户端](#问卷响应---用户端)
- [问卷响应 - 匿名提交](#问卷响应---匿名提交)

---

## API 详情

### Security - 安全管理

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/admin/security/metrics` | 获取安全指标 |
| `GET` | `/admin/security/blacklist` | 获取IP黑名单 |
| `POST` | `/admin/security/blacklist` | 添加IP到黑名单 |
| `POST` | `/admin/security/blacklist/{ip}/remove` | 从黑名单移除IP |
| `POST` | `/admin/security/blacklist/auto/{ip}` | 自动封禁可疑IP |
| `POST` | `/admin/security/cleanup` | 清理过期的安全数据 |
| `GET` | `/admin/security/suspicious/{ip}` | 检查IP是否可疑 |
| `GET` | `/admin/security/overview` | 获取安全概览 |

#### GET /admin/security/metrics

**获取安全指标**

查询指定IP在时间窗口内的安全事件统计，包括失败登录、签名失败、限流触发等

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `ip` | query | string | 否 | 要查询的IP地址 |
| `windowMinutes` | query | number | 否 | 查询时间窗口（分钟），默认60分钟 |

**响应**

- **200**: 安全指标获取成功

```json
{
  "failedLogins": 5,
  "signatureFailures": 10,
  "rateLimitHits": 3,
  "suspiciousActivities": 2,
  "windowMinutes": 60
}
```
- **401**: 未授权
- **403**: 权限不足
- **429**: 请求过于频繁

---

#### GET /admin/security/blacklist

**获取IP黑名单**

获取当前所有有效的IP黑名单条目列表

🔐 **需要认证**

**响应**

- **200**: 黑名单获取成功

```json
[
  {
  "ip": "192.168.1.100",
  "reason": "频繁登录失败",
  "expiresAt": 1735689600000,
  "createdAt": 1704067200000,
  "createdBy": "admin_001"
}
]
```
- **401**: 未授权
- **403**: 权限不足

---

#### POST /admin/security/blacklist

**添加IP到黑名单**

手动将指定IP添加到黑名单，可设置过期时间

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "ip": "192.168.1.100",
  "reason": "频繁登录失败，疑似暴力破解",
  "expiresAt": 1735689600000,
  "createdBy": "admin_001"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `ip` | string | 是 | IP地址 |
| `reason` | string | 是 | 封禁原因 |
| `expiresAt` | number | 否 | 过期时间戳（毫秒），不填则永久封禁 |
| `createdBy` | string | 否 | 创建者标识 |

**响应**

- **201**: IP添加成功

```json
{
  "success": true
}
```
- **400**: 请求参数错误
- **401**: 未授权
- **403**: 权限不足

---

#### POST /admin/security/blacklist/{ip}/remove

**从黑名单移除IP**

将指定IP从黑名单中移除，恢复其访问权限

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `ip` | path | string | 是 | 要移除的IP地址 |

**响应**

- **200**: IP移除成功

```json
{
  "success": true
}
```
- **401**: 未授权
- **403**: 权限不足

---

#### POST /admin/security/blacklist/auto/{ip}

**自动封禁可疑IP**

根据安全策略自动封禁可疑IP，设置有限期的封禁时长

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `ip` | path | string | 是 | 要封禁的IP地址 |

**请求体**

Content-Type: `application/json`

```json
{
  "reason": "可疑活动检测：登录失败次数过多",
  "durationHours": 24
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `reason` | string | 是 | 封禁原因 |
| `durationHours` | number | 否 | 封禁时长（小时），默认24小时 |

**响应**

- **201**: IP自动封禁成功

```json
{
  "success": true
}
```
- **400**: 请求参数错误
- **401**: 未授权
- **403**: 权限不足

---

#### POST /admin/security/cleanup

**清理过期的安全数据**

清理过期的黑名单条目和安全事件记录，释放存储空间

🔐 **需要认证**

**响应**

- **200**: 清理完成

```json
{
  "success": true,
  "cleanedEntries": 5,
  "cleanedEvents": 100
}
```
- **401**: 未授权
- **403**: 权限不足
- **429**: 请求过于频繁

---

#### GET /admin/security/suspicious/{ip}

**检查IP是否可疑**

检查指定IP在时间窗口内是否存在可疑活动

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `ip` | path | string | 是 | 要检查的IP地址 |
| `windowMinutes` | query | number | 是 | - |

**响应**

- **200**: 检查完成

```json
{
  "suspicious": true,
  "metrics": null
}
```
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/security/overview

**获取安全概览**

获取系统整体安全状况的概览信息

🔐 **需要认证**

**响应**

- **200**: 概览获取成功

```json
{
  "blacklist": {
    "total": 10,
    "permanent": 3,
    "temporary": 7
  },
  "metrics": null,
  "timestamp": 1704067200000
}
```
- **401**: 未授权
- **403**: 权限不足

---

### Database Monitor - 数据库监控

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/admin/database/stats` | 获取数据库查询统计 |
| `GET` | `/admin/database/slow-queries` | 获取最慢的查询 |
| `GET` | `/admin/database/cache/stats` | 获取缓存统计信息 |
| `POST` | `/admin/database/cache/clear` | 清理查询缓存 |
| `POST` | `/admin/database/slow-queries/cleanup` | 清理过期的慢查询记录 |
| `POST` | `/admin/database/stats/reset` | 重置查询统计 |
| `GET` | `/admin/database/overview` | 获取数据库监控概览 |

#### GET /admin/database/stats

**获取数据库查询统计**

获取指定时间窗口内的数据库查询统计信息

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `windowMinutes` | query | number | 否 | 查询时间窗口（分钟），默认60分钟 |

**响应**

- **200**: 统计信息获取成功

```json
{
  "totalQueries": 10000,
  "slowQueries": 50,
  "avgDuration": 45.5,
  "maxDuration": 3500,
  "slowestQueries": []
}
```
- **401**: 未授权
- **403**: 权限不足
- **429**: 请求过于频繁

---

#### GET /admin/database/slow-queries

**获取最慢的查询**

获取执行时间最长的查询列表，用于性能优化分析

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `limit` | query | number | 否 | 返回记录数量限制，默认10条 |

**响应**

- **200**: 慢查询列表获取成功

```json
[
  {
  "sql": "SELECT * FROM users WHERE id = ?",
  "duration": 1500,
  "params": [],
  "timestamp": 1704067200000,
  "source": "UserService",
  "userId": 1001,
  "ip": "192.168.1.100"
}
]
```
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/database/cache/stats

**获取缓存统计信息**

获取查询缓存的统计信息，包括键数量、内存使用等

🔐 **需要认证**

**响应**

- **200**: 缓存统计获取成功

```json
{
  "totalKeys": 1500,
  "memoryUsage": "256MB",
  "hitRate": 0.85
}
```
- **401**: 未授权
- **403**: 权限不足

---

#### POST /admin/database/cache/clear

**清理查询缓存**

清理所有查询缓存，用于缓存失效或数据刷新场景

🔐 **需要认证**

**响应**

- **200**: 缓存清理成功

```json
{
  "success": true,
  "clearedKeys": 150
}
```
- **401**: 未授权
- **403**: 权限不足
- **429**: 请求过于频繁

---

#### POST /admin/database/slow-queries/cleanup

**清理过期的慢查询记录**

清理指定天数之前的慢查询记录，释放存储空间

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `days` | query | number | 否 | 清理多少天前的记录，默认7天 |

**响应**

- **200**: 清理完成

```json
{
  "success": true,
  "cleanedCount": 500
}
```
- **401**: 未授权
- **403**: 权限不足
- **429**: 请求过于频繁

---

#### POST /admin/database/stats/reset

**重置查询统计**

重置所有查询统计数据，从头开始计算

🔐 **需要认证**

**响应**

- **200**: 统计重置成功

```json
{
  "success": true
}
```
- **401**: 未授权
- **403**: 权限不足
- **429**: 请求过于频繁

---

#### GET /admin/database/overview

**获取数据库监控概览**

获取数据库监控的综合概览信息，包括查询统计、缓存状态等

🔐 **需要认证**

**响应**

- **200**: 概览获取成功

```json
{
  "queryStats": null,
  "cacheStats": null,
  "slowestQueries": [],
  "timestamp": 1704067200000
}
```
- **401**: 未授权
- **403**: 权限不足

---

### security

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/security/ephemeral-credential` | 签发短期 HMAC 临时密钥 |

#### POST /security/ephemeral-credential

**签发短期 HMAC 临时密钥**

🔐 **需要认证**

**响应**

- **201**: 

---

### Monitoring - 系统监控

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/admin/monitoring/system/metrics` | 获取系统指标 |
| `GET` | `/admin/monitoring/application/metrics` | 获取应用指标 |
| `GET` | `/admin/monitoring/health` | 执行健康检查 |
| `GET` | `/admin/monitoring/system/history` | 获取系统历史指标 |
| `GET` | `/admin/monitoring/application/history` | 获取应用历史指标 |
| `GET` | `/admin/monitoring/business/metrics` | 获取业务指标 |
| `GET` | `/admin/monitoring/business/dashboard` | 获取仪表板数据 |
| `GET` | `/admin/monitoring/business/trends/{metric}` | 获取指标趋势 |
| `POST` | `/admin/monitoring/alerts/rules` | 创建告警规则 |
| `GET` | `/admin/monitoring/alerts/rules` | 获取所有告警规则 |
| `GET` | `/admin/monitoring/alerts/rules/{ruleId}` | 获取告警规则 |
| `POST` | `/admin/monitoring/alerts/rules/{ruleId}/update` | 更新告警规则 |
| `POST` | `/admin/monitoring/alerts/rules/{ruleId}/delete` | 删除告警规则 |
| `GET` | `/admin/monitoring/alerts/active` | 获取活跃告警 |
| `GET` | `/admin/monitoring/alerts/history` | 获取告警历史 |
| `POST` | `/admin/monitoring/alerts/{alertId}/resolve` | 解决告警 |
| `GET` | `/admin/monitoring/notifications/config` | 获取通知配置 |
| `POST` | `/admin/monitoring/notifications/config` | 设置通知配置 |
| `GET` | `/admin/monitoring/notifications/queue/stats` | 获取通知队列统计 |
| `GET` | `/admin/monitoring/notifications/failed` | 获取失败的通知 |
| `POST` | `/admin/monitoring/notifications/failed/{jobId}/retry` | 重试失败的通知 |
| `POST` | `/admin/monitoring/notifications/failed/retry-all` | 重试所有失败的通知 |
| `POST` | `/admin/monitoring/metrics/check` | 手动检查指标 |
| `GET` | `/admin/monitoring/overview` | 获取监控概览 |

#### GET /admin/monitoring/system/metrics

**获取系统指标**

获取当前系统的CPU、内存、磁盘、网络等指标

🔐 **需要认证**

**响应**

- **200**: 系统指标获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/application/metrics

**获取应用指标**

获取应用的请求统计、用户统计、数据库统计等指标

🔐 **需要认证**

**响应**

- **200**: 应用指标获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/health

**执行健康检查**

检查系统各服务组件的健康状态

🔐 **需要认证**

**响应**

- **200**: 健康检查完成
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/system/history

**获取系统历史指标**

获取指定时间范围内的系统历史指标数据

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `hours` | query | number | 否 | 查询小时数，默认24小时 |

**响应**

- **200**: 历史指标获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/application/history

**获取应用历史指标**

获取指定时间范围内的应用历史指标数据

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `hours` | query | number | 否 | 查询小时数，默认24小时 |

**响应**

- **200**: 历史指标获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/business/metrics

**获取业务指标**

获取用户、认证、安全等业务指标

🔐 **需要认证**

**响应**

- **200**: 业务指标获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/business/dashboard

**获取仪表板数据**

获取用于仪表板展示的综合数据

🔐 **需要认证**

**响应**

- **200**: 仪表板数据获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/business/trends/{metric}

**获取指标趋势**

获取指定指标的历史趋势数据

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `metric` | path | string | 是 | 指标名称 |
| `days` | query | number | 否 | 查询天数，默认7天 |

**响应**

- **200**: 指标趋势获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### POST /admin/monitoring/alerts/rules

**创建告警规则**

创建新的告警规则，用于监控指标并触发告警

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "name": "CPU使用率过高",
  "metric": "cpu.usage",
  "threshold": 80,
  "operator": "gt",
  "duration": 300,
  "severity": "high",
  "enabled": true,
  "channels": [
    "email",
    "slack"
  ],
  "recipients": [
    "admin@example.com",
    "ops@example.com"
  ]
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 是 | 规则名称 |
| `metric` | string | 是 | 监控指标名称 |
| `threshold` | number | 是 | 阈值 |
| `operator` | enum(gt|lt|eq|gte|lte) | 是 | 比较操作符 |
| `duration` | number | 是 | 持续时间（秒） |
| `severity` | enum(low|medium|high|critical) | 是 | 告警级别 |
| `enabled` | boolean | 是 | 是否启用 |
| `channels` | enum(email|sms|webhook|slack)[] | 是 | 通知渠道 |
| `recipients` | string[] | 是 | 通知接收者（邮箱或ID列表） |

**响应**

- **201**: 告警规则创建成功

```json
{
  "ruleId": "rule_1704067200000_abc123"
}
```
- **400**: 请求参数错误
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/alerts/rules

**获取所有告警规则**

获取当前所有告警规则列表

🔐 **需要认证**

**响应**

- **200**: 告警规则获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/alerts/rules/{ruleId}

**获取告警规则**

根据规则ID获取告警规则详情

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `ruleId` | path | string | 是 | 规则ID |

**响应**

- **200**: 告警规则获取成功
- **401**: 未授权
- **403**: 权限不足
- **404**: 规则不存在

---

#### POST /admin/monitoring/alerts/rules/{ruleId}/update

**更新告警规则**

更新指定告警规则的配置

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `ruleId` | path | string | 是 | 规则ID |

**请求体**

Content-Type: `application/json`

```json
{
  "name": "CPU使用率过高",
  "threshold": 90,
  "operator": "gt",
  "duration": 0,
  "severity": "low",
  "enabled": true,
  "channels": [],
  "recipients": []
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 否 | 规则名称 |
| `threshold` | number | 否 | 阈值 |
| `operator` | enum(gt|lt|eq|gte|lte) | 否 | 比较操作符 |
| `duration` | number | 否 | 持续时间（秒） |
| `severity` | enum(low|medium|high|critical) | 否 | 告警级别 |
| `enabled` | boolean | 否 | 是否启用 |
| `channels` | enum(email|sms|webhook|slack)[] | 否 | 通知渠道 |
| `recipients` | string[] | 否 | 通知接收者 |

**响应**

- **200**: 告警规则更新成功

```json
{
  "success": true
}
```
- **400**: 请求参数错误
- **401**: 未授权
- **403**: 权限不足
- **404**: 规则不存在

---

#### POST /admin/monitoring/alerts/rules/{ruleId}/delete

**删除告警规则**

删除指定的告警规则

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `ruleId` | path | string | 是 | 规则ID |

**响应**

- **200**: 告警规则删除成功

```json
{
  "success": true
}
```
- **401**: 未授权
- **403**: 权限不足
- **404**: 规则不存在

---

#### GET /admin/monitoring/alerts/active

**获取活跃告警**

获取当前所有未解决的活跃告警

🔐 **需要认证**

**响应**

- **200**: 活跃告警获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/alerts/history

**获取告警历史**

获取告警历史记录

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `limit` | query | number | 否 | 返回记录数量限制，默认100条 |

**响应**

- **200**: 告警历史获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### POST /admin/monitoring/alerts/{alertId}/resolve

**解决告警**

标记告警已解决并记录解决方案

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `alertId` | path | string | 是 | 告警ID |

**请求体**

Content-Type: `application/json`

```json
{
  "resolution": "已优化SQL查询，CPU使用率已恢复正常"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `resolution` | string | 是 | 解决方案描述 |

**响应**

- **200**: 告警解决成功

```json
{
  "success": true
}
```
- **400**: 请求参数错误
- **401**: 未授权
- **403**: 权限不足
- **404**: 告警不存在

---

#### GET /admin/monitoring/notifications/config

**获取通知配置**

获取当前的通知渠道配置

🔐 **需要认证**

**响应**

- **200**: 通知配置获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### POST /admin/monitoring/notifications/config

**设置通知配置**

设置通知渠道的配置参数

🔐 **需要认证**

**响应**

- **200**: 通知配置设置成功

```json
{
  "success": true
}
```
- **400**: 请求参数错误
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/notifications/queue/stats

**获取通知队列统计**

获取 BullMQ 通知队列的统计信息

🔐 **需要认证**

**响应**

- **200**: 队列统计获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/notifications/failed

**获取失败的通知**

获取发送失败的通知列表

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `limit` | query | number | 否 | 返回记录数量限制，默认100条 |

**响应**

- **200**: 失败通知获取成功
- **401**: 未授权
- **403**: 权限不足

---

#### POST /admin/monitoring/notifications/failed/{jobId}/retry

**重试失败的通知**

重新发送指定的失败通知

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `jobId` | path | string | 是 | 任务ID |

**响应**

- **200**: 重试成功

```json
{
  "success": true
}
```
- **401**: 未授权
- **403**: 权限不足

---

#### POST /admin/monitoring/notifications/failed/retry-all

**重试所有失败的通知**

重新发送所有失败的通知

🔐 **需要认证**

**响应**

- **200**: 重试成功
- **401**: 未授权
- **403**: 权限不足

---

#### POST /admin/monitoring/metrics/check

**手动检查指标**

手动触发指标检查，用于测试告警规则

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "metric": "cpu.usage",
  "value": 85.5
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `metric` | string | 是 | 指标名称 |
| `value` | number | 是 | 指标值 |

**响应**

- **200**: 指标检查完成

```json
{
  "success": true
}
```
- **400**: 请求参数错误
- **401**: 未授权
- **403**: 权限不足

---

#### GET /admin/monitoring/overview

**获取监控概览**

获取系统监控的综合概览信息

🔐 **需要认证**

**响应**

- **200**: 监控概览获取成功

```json
{
  "system": {
    "cpu": 45.5,
    "memory": 62.3,
    "load": 1.2
  },
  "application": {
    "requests": 10000,
    "errors": 50,
    "responseTime": 150
  },
  "health": {
    "status": "healthy",
    "score": 95,
    "services": 4
  },
  "business": {
    "users": 1000,
    "activeUsers": 200,
    "alerts": 3
  },
  "alerts": {
    "active": 2,
    "critical": 0,
    "high": 1
  },
  "timestamp": 1704067200000
}
```
- **401**: 未授权
- **403**: 权限不足

---

### auth

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/auth/email/send` | 发送邮箱验证码（注册/登录/重置） |
| `POST` | `/auth/login` | 用户登录（颁发 Access/Refresh，落会话） |
| `POST` | `/auth/register` | 用户注册（可含邮箱验证码校验）并自动登录 |
| `POST` | `/auth/refresh` | 刷新 Access（轮换 RefreshToken） |

#### POST /auth/email/send

**发送邮箱验证码（注册/登录/重置）**

**请求体**

Content-Type: `application/json`

```json
{
  "email": "user@example.com",
  "scene": "register"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `email` | string | 是 | - |
| `scene` | enum(register|login|reset) | 是 | - |

**响应**

- **201**: 

---

#### POST /auth/login

**用户登录（颁发 Access/Refresh，落会话）**

**请求体**

Content-Type: `application/json`

```json
{
  "account": "john@example.com 或 john_doe",
  "password": "string",
  "deviceId": "string",
  "deviceName": "iPhone 14 Pro",
  "platform": "web"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `account` | string | 是 | 登录账号（邮箱或用户名） |
| `password` | string | 是 | 密码 |
| `deviceId` | string | 否 | 设备ID（指纹或本地生成） |
| `deviceName` | string | 否 | 设备名 |
| `platform` | enum(ios|android|web|desktop) | 否 | 平台 |

**响应**

- **201**: 

---

#### POST /auth/register

**用户注册（可含邮箱验证码校验）并自动登录**

**请求体**

Content-Type: `application/json`

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "emailcode": "string",
  "phone": "+86-13800000000",
  "password": "Password123!",
  "nickname": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `username` | string | 否 | 用户名 |
| `email` | string | 否 | 邮箱地址 |
| `emailcode` | string | 否 | 注册用邮箱验证码（有 email 时必填） |
| `phone` | string | 否 | 手机号（含区号） |
| `password` | string | 是 | 密码 |
| `nickname` | string | 否 | 昵称 |

**响应**

- **201**: 

---

#### POST /auth/refresh

**刷新 Access（轮换 RefreshToken）**

**响应**

- **201**: 

---

### Auth Security

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/auth/security/mfa/setup` | 设置MFA |
| `POST` | `/auth/security/mfa/verify` | 验证MFA代码并启用 |
| `POST` | `/auth/security/mfa/disable` | 禁用MFA |
| `GET` | `/auth/security/mfa/status` | 获取MFA状态 |
| `POST` | `/auth/security/mfa/backup-codes/regenerate` | 重新生成备用代码 |
| `GET` | `/auth/security/devices` | 获取用户设备列表 |
| `POST` | `/auth/security/devices/{deviceId}/trust` | 信任设备 |
| `POST` | `/auth/security/devices/{deviceId}/untrust` | 取消信任设备 |
| `POST` | `/auth/security/devices/{deviceId}/delete` | 删除设备 |
| `GET` | `/auth/security/devices/trust-settings` | 获取设备信任设置 |
| `POST` | `/auth/security/devices/trust-settings` | 设置设备信任设置 |
| `GET` | `/auth/security/login-history` | 获取登录历史 |
| `POST` | `/auth/security/password/check` | 检查密码强度 |
| `GET` | `/auth/security/password/policy` | 获取密码策略 |
| `POST` | `/auth/security/password/generate` | 生成安全密码 |
| `GET` | `/auth/security/alerts` | 获取安全告警 |
| `POST` | `/auth/security/alerts/{alertId}/read` | 标记告警为已读 |
| `POST` | `/auth/security/alerts/{alertId}/resolve` | 解决告警 |
| `GET` | `/auth/security/alerts/settings` | 获取告警设置 |
| `POST` | `/auth/security/alerts/settings` | 设置告警设置 |
| `GET` | `/auth/security/stats` | 获取安全统计信息 |

#### POST /auth/security/mfa/setup

**设置MFA**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{}
```

**响应**

- **200**: MFA设置生成成功

---

#### POST /auth/security/mfa/verify

**验证MFA代码并启用**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{}
```

**响应**

- **200**: MFA验证成功

---

#### POST /auth/security/mfa/disable

**禁用MFA**

🔐 **需要认证**

**响应**

- **200**: MFA禁用成功

---

#### GET /auth/security/mfa/status

**获取MFA状态**

🔐 **需要认证**

**响应**

- **200**: MFA状态获取成功

---

#### POST /auth/security/mfa/backup-codes/regenerate

**重新生成备用代码**

🔐 **需要认证**

**响应**

- **200**: 备用代码重新生成成功

---

#### GET /auth/security/devices

**获取用户设备列表**

🔐 **需要认证**

**响应**

- **200**: 设备列表获取成功

---

#### POST /auth/security/devices/{deviceId}/trust

**信任设备**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `deviceId` | path | string | 是 | - |

**响应**

- **200**: 设备信任成功

---

#### POST /auth/security/devices/{deviceId}/untrust

**取消信任设备**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `deviceId` | path | string | 是 | - |

**响应**

- **200**: 设备取消信任成功

---

#### POST /auth/security/devices/{deviceId}/delete

**删除设备**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `deviceId` | path | string | 是 | - |

**响应**

- **200**: 设备删除成功

---

#### GET /auth/security/devices/trust-settings

**获取设备信任设置**

🔐 **需要认证**

**响应**

- **200**: 设备信任设置获取成功

---

#### POST /auth/security/devices/trust-settings

**设置设备信任设置**

🔐 **需要认证**

**响应**

- **200**: 设备信任设置更新成功

---

#### GET /auth/security/login-history

**获取登录历史**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `limit` | query | number | 是 | - |

**响应**

- **200**: 登录历史获取成功

---

#### POST /auth/security/password/check

**检查密码强度**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{}
```

**响应**

- **200**: 密码强度检查完成

---

#### GET /auth/security/password/policy

**获取密码策略**

🔐 **需要认证**

**响应**

- **200**: 密码策略获取成功

---

#### POST /auth/security/password/generate

**生成安全密码**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `length` | query | number | 是 | - |

**响应**

- **200**: 安全密码生成成功

---

#### GET /auth/security/alerts

**获取安全告警**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `limit` | query | number | 是 | - |
| `includeResolved` | query | boolean | 是 | - |

**响应**

- **200**: 安全告警获取成功

---

#### POST /auth/security/alerts/{alertId}/read

**标记告警为已读**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `alertId` | path | string | 是 | - |

**响应**

- **200**: 告警标记为已读成功

---

#### POST /auth/security/alerts/{alertId}/resolve

**解决告警**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `alertId` | path | string | 是 | - |

**响应**

- **200**: 告警解决成功

---

#### GET /auth/security/alerts/settings

**获取告警设置**

🔐 **需要认证**

**响应**

- **200**: 告警设置获取成功

---

#### POST /auth/security/alerts/settings

**设置告警设置**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{}
```

**响应**

- **200**: 告警设置更新成功

---

#### GET /auth/security/stats

**获取安全统计信息**

🔐 **需要认证**

**响应**

- **200**: 安全统计信息获取成功

---

### users

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/users/me` | 获取我的信息 |
| `POST` | `/users/me/update` | 更新我的资料（POST 语义：执行一次更新动作） |
| `POST` | `/users/me/password` | 修改密码（旧密码校验 + pv 自增） |

#### GET /users/me

**获取我的信息**

🔐 **需要认证**

**响应**

- **200**: 

---

#### POST /users/me/update

**更新我的资料（POST 语义：执行一次更新动作）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "nickname": "string",
  "avatar_url": "string",
  "gender": "unknown",
  "birthday": "1990-06-01",
  "country": "CN",
  "locale": "zh-CN",
  "time_zone": "Asia/Shanghai",
  "marketing_consent": false
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `nickname` | string | 否 | 昵称 |
| `avatar_url` | string | 否 | 头像 URL |
| `gender` | enum(unknown|male|female|other) | 否 | 性别 |
| `birthday` | string | 否 | 生日（YYYY-MM-DD） |
| `country` | string | 否 | 国家/地区码（ISO 3166-1 alpha-2） |
| `locale` | string | 否 | 语言（如 zh-CN） |
| `time_zone` | string | 否 | 时区（IANA） |
| `marketing_consent` | boolean | 否 | 营销/通知同意 |

**响应**

- **201**: 

---

#### POST /users/me/password

**修改密码（旧密码校验 + pv 自增）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "current": "Old@123456",
  "new": "New@123456"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `current` | string | 是 | 当前密码 |
| `new` | string | 是 | 新密码 |

**响应**

- **201**: 

---

### auth/oauth

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/auth/oauth/{provider}/authorize` | 生成第三方授权 URL（带 state/PKCE） |
| `GET` | `/auth/oauth/{provider}/callback` | 第三方回调，用 code 换 token+资料 -> 登录/注册 |
| `POST` | `/auth/oauth/wechat-mp/login` | 微信小程序登录（code -> openid/unionid） |

#### GET /auth/oauth/{provider}/authorize

**生成第三方授权 URL（带 state/PKCE）**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `provider` | path | string | 是 | - |
| `state` | query | string | 是 | - |
| `code_verifier` | query | string | 是 | - |

**响应**

- **200**: 

---

#### GET /auth/oauth/{provider}/callback

**第三方回调，用 code 换 token+资料 -> 登录/注册**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `provider` | path | string | 是 | - |
| `code` | query | string | 是 | - |
| `state` | query | string | 是 | - |

**响应**

- **200**: 

---

#### POST /auth/oauth/wechat-mp/login

**微信小程序登录（code -> openid/unionid）**

**请求体**

Content-Type: `application/json`

```json
{
  "code": "string",
  "encryptedData": "string",
  "iv": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `code` | string | 是 | wx.login 返回的 code |
| `encryptedData` | string | 否 | wx.getUserInfo/手机授权返回的 encryptedData（可选用于拿 unionId） |
| `iv` | string | 否 | 配套 IV（可选） |

**响应**

- **201**: 

---

### 图片上传

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/upload/image` | 上传图片 |
| `GET` | `/upload/my-files` | 获取我的文件列表 |
| `DELETE` | `/upload/{fileId}` | 删除文件 |
| `GET` | `/upload/{fileId}` | 获取文件详情 |

#### POST /upload/image

**上传图片**

上传单张图片，支持 jpg/png/gif/webp 格式，最大5MB。字段名必须为 file。

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `category` | query | string | 否 | 图片分类：avatar（头像）, other（其他） |

**请求体**

Content-Type: `multipart/form-data`

```json
{
  "file": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `file` | string(binary) | 是 | 图片文件 |

**响应**

- **201**: 上传成功

```json
{
  "id": "string",
  "filename": "string",
  "originalName": "string",
  "size": 0,
  "mimeType": "string",
  "url": "string",
  "uploadedAt": "string"
}
```
- **400**: 请求错误（文件类型不支持、文件过大等）
- **401**: 未授权（缺少或无效的 JWT Token）

---

#### GET /upload/my-files

**获取我的文件列表**

获取当前登录用户上传的所有文件

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `category` | query | string | 否 | 文件分类 |
| `page` | query | number | 否 | 页码 |
| `limit` | query | number | 否 | 每页数量 |

**响应**

- **200**: 获取成功

```json
{
  "items": [],
  "total": 0,
  "page": 0,
  "pageSize": 0
}
```
- **401**: 未授权

---

#### DELETE /upload/{fileId}

**删除文件**

删除指定的文件（仅允许上传者删除）

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `fileId` | path | string | 是 | 文件ID |

**响应**

- **200**: 删除成功
- **400**: 文件不存在或无权删除
- **401**: 未授权

---

#### GET /upload/{fileId}

**获取文件详情**

获取指定文件的详细信息

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `fileId` | path | string | 是 | 文件ID |

**响应**

- **200**: 获取成功
- **404**: 文件不存在

---

### 文章 - 用户端

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/article/list` | 获取文章列表 |
| `GET` | `/article/featured` | 获取推荐文章 |
| `GET` | `/article/top` | 获取置顶文章 |
| `GET` | `/article/detail/{uid}` | 获取文章详情 |
| `POST` | `/article/like/{uid}` | 点赞文章 |
| `GET` | `/article/category/{categoryId}` | 按分类获取文章 |

#### GET /article/list

**获取文章列表**

获取已发布的文章列表，支持分页和筛选

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `page` | query | number | 否 | 页码，从 1 开始 |
| `pageSize` | query | number | 否 | 每页条数，默认 20，最大 100 |
| `keyword` | query | string | 否 | 关键字搜索（标题、摘要） |
| `categoryId` | query | number | 否 | 分类 ID |

**响应**

- **200**: 返回文章列表

```json
{
  "total": 100,
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

---

#### GET /article/featured

**获取推荐文章**

获取推荐的文章列表

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `limit` | query | string | 否 | 数量限制，默认10 |

**响应**

- **200**: 返回推荐文章列表

```json
[
  {
  "uid": "123456789012",
  "title": "如何使用 NestJS",
  "subTitle": "string",
  "summary": "本文介绍...",
  "coverUrl": "string",
  "categoryId": 0,
  "categoryName": "技术文章",
  "tags": [],
  "isTop": false,
  "isFeatured": false,
  "viewCount": 100,
  "likeCount": 10,
  "publishedAt": "string"
}
]
```

---

#### GET /article/top

**获取置顶文章**

获取置顶的文章列表

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `limit` | query | string | 否 | 数量限制，默认5 |

**响应**

- **200**: 返回置顶文章列表

```json
[
  {
  "uid": "123456789012",
  "title": "如何使用 NestJS",
  "subTitle": "string",
  "summary": "本文介绍...",
  "coverUrl": "string",
  "categoryId": 0,
  "categoryName": "技术文章",
  "tags": [],
  "isTop": false,
  "isFeatured": false,
  "viewCount": 100,
  "likeCount": 10,
  "publishedAt": "string"
}
]
```

---

#### GET /article/detail/{uid}

**获取文章详情**

根据 UID 获取文章详情，并增加阅读量

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `uid` | path | string | 是 | 文章 UID |

**响应**

- **200**: 返回文章详情

```json
{
  "uid": "123456789012",
  "title": "如何使用 NestJS",
  "subTitle": "string",
  "summary": "本文介绍...",
  "coverUrl": "string",
  "categoryId": 0,
  "categoryName": "技术文章",
  "tags": [],
  "isTop": false,
  "isFeatured": false,
  "viewCount": 100,
  "likeCount": 10,
  "publishedAt": "string",
  "content": "string",
  "contentFormat": "markdown",
  "seoTitle": "string",
  "seoKeywords": "string",
  "seoDescription": "string"
}
```

---

#### POST /article/like/{uid}

**点赞文章**

为文章点赞

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `uid` | path | string | 是 | 文章 UID |

**响应**

- **200**: 返回当前点赞数

---

#### GET /article/category/{categoryId}

**按分类获取文章**

获取指定分类下的文章列表

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `categoryId` | path | string | 是 | 分类 ID |
| `page` | query | number | 否 | 页码，从 1 开始 |
| `pageSize` | query | number | 否 | 每页条数，默认 20，最大 100 |
| `keyword` | query | string | 否 | 关键字搜索（标题、摘要） |

**响应**

- **200**: 返回文章列表

```json
{
  "total": 100,
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

---

### 问卷 - 用户端

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/survey/list` | 获取问卷列表 |
| `GET` | `/survey/category/{categoryId}` | 按分类获取问卷 |
| `GET` | `/survey/detail/{uid}` | 获取问卷详情 |

#### GET /survey/list

**获取问卷列表**

获取当前进行中的问卷列表

**响应**

- **200**: 返回问卷列表

```json
[
  {
  "uid": "string",
  "title": {},
  "description": {},
  "themeColor": "string",
  "loginRequired": true,
  "startTime": "string",
  "endTime": "string",
  "categoryId": 0,
  "categoryName": "string"
}
]
```

---

#### GET /survey/category/{categoryId}

**按分类获取问卷**

获取指定分类下进行中的问卷

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `categoryId` | path | string | 是 | 分类 ID |

**响应**

- **200**: 返回问卷列表

```json
[
  {
  "uid": "string",
  "title": {},
  "description": {},
  "themeColor": "string",
  "loginRequired": true,
  "startTime": "string",
  "endTime": "string",
  "categoryId": 0,
  "categoryName": "string"
}
]
```

---

#### GET /survey/detail/{uid}

**获取问卷详情**

根据 UID 获取问卷详情，用于答题

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `uid` | path | string | 是 | 问卷 UID |

**响应**

- **200**: 返回问卷详情

```json
{
  "uid": "string",
  "title": {},
  "description": {},
  "themeColor": "string",
  "loginRequired": true,
  "startTime": "string",
  "endTime": "string",
  "categoryId": 0,
  "categoryName": "string",
  "topics": {},
  "endMessage": {},
  "showQuestionIndex": true,
  "languagesList": [],
  "requireGameBinding": true,
  "maxSubmitTimesPerUser": 0
}
```

---

### 配置 - 用户端

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/config/module/{moduleCode}` | 获取模块配置列表 |
| `GET` | `/config/module/{moduleCode}/values` | 获取模块配置值 |
| `GET` | `/config/{moduleCode}/{itemKey}` | 获取单个配置值 |
| `GET` | `/config/batch/{moduleCode}/{itemKeys}` | 批量获取配置值 |

#### GET /config/module/{moduleCode}

**获取模块配置列表**

获取指定模块下所有启用的配置项

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `moduleCode` | path | string | 是 | 模块编码 |

**响应**

- **200**: 返回配置列表

```json
[
  {
  "itemKey": "max_article_count",
  "value": "100",
  "itemType": "number",
  "itemName": "最大文章数量",
  "options": [],
  "description": "系统允许的最大文章数量"
}
]
```

---

#### GET /config/module/{moduleCode}/values

**获取模块配置值**

获取指定模块下所有配置的键值对

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `moduleCode` | path | string | 是 | 模块编码 |

**响应**

- **200**: 返回配置键值对

```json
[
  {
  "itemKey": "max_article_count",
  "value": "100",
  "itemType": "number"
}
]
```

---

#### GET /config/{moduleCode}/{itemKey}

**获取单个配置值**

根据 moduleCode 和 itemKey 获取单个配置的值

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `moduleCode` | path | string | 是 | 模块编码 |
| `itemKey` | path | string | 是 | 配置项 key |

**响应**

- **200**: 返回配置值

---

#### GET /config/batch/{moduleCode}/{itemKeys}

**批量获取配置值**

一次获取多个配置项的值，itemKeys 用逗号分隔

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `moduleCode` | path | string | 是 | 模块编码 |
| `itemKeys` | path | string | 是 | 配置项 keys（逗号分隔） |

**响应**

- **200**: 返回配置键值对映射

---

### admin-auth

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/admin/auth/login` | 管理员登录 |
| `POST` | `/admin/auth/register` | 创建管理员并自动登录（根据权限控制） |
| `POST` | `/admin/auth/refresh` | 刷新 Access（轮换 RefreshToken） |

#### POST /admin/auth/login

**管理员登录**

**请求体**

Content-Type: `application/json`

```json
{
  "account": "john@example.com 或 john_doe",
  "password": "string",
  "deviceId": "string",
  "deviceName": "iPhone 14 Pro",
  "platform": "web"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `account` | string | 是 | 登录账号（邮箱或用户名） |
| `password` | string | 是 | 密码 |
| `deviceId` | string | 否 | 设备ID（指纹或本地生成） |
| `deviceName` | string | 否 | 设备名 |
| `platform` | enum(ios|android|web|desktop) | 否 | 平台 |

**响应**

- **201**: 

---

#### POST /admin/auth/register

**创建管理员并自动登录（根据权限控制）**

**请求体**

Content-Type: `application/json`

```json
{
  "username": "john_doe",
  "password": "Password123!",
  "email": "john@example.com",
  "nickname": "string",
  "emailcode": "string",
  "roleCodes": [
    "super_admin",
    "ops"
  ]
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `username` | string | 否 | 用户名 |
| `password` | string | 是 | 密码 |
| `email` | string | 否 | 邮箱地址 |
| `nickname` | string | 否 | 昵称 |
| `emailcode` | string | 否 | 注册用邮箱验证码（有 email 时必填） |
| `roleCodes` | string[] | 否 | 角色代码列表（可选，按 code 绑定） |

**响应**

- **201**: 

---

#### POST /admin/auth/refresh

**刷新 Access（轮换 RefreshToken）**

**响应**

- **201**: 

---

### admin-users

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/admin/users/create` | 创建管理员（POST） |
| `GET` | `/admin/users` | 管理员列表（GET，支持分页/搜索） |
| `POST` | `/admin/users/detail` | 管理员详情（POST） |
| `POST` | `/admin/users/update` | 更新管理员资料（POST，目标管理员） |
| `POST` | `/admin/users/delete` | 删除管理员（POST） |
| `POST` | `/admin/users/batch-delete` | 批量删除管理员（POST） |
| `POST` | `/admin/users/assign-roles` | 为管理员分配角色（POST，按 roleCodes 全量覆盖） |
| `GET` | `/admin/users/me` | 我的信息（GET） |
| `POST` | `/admin/users/me/update` | 更新我的资料（POST） |
| `POST` | `/admin/users/me/password` | 修改我的密码（POST） |

#### POST /admin/users/create

**创建管理员（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "username": "john_doe",
  "password": "Password123!",
  "email": "john@example.com",
  "nickname": "string",
  "emailcode": "string",
  "roleCodes": [
    "super_admin",
    "ops"
  ]
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `username` | string | 否 | 用户名 |
| `password` | string | 是 | 密码 |
| `email` | string | 否 | 邮箱地址 |
| `nickname` | string | 否 | 昵称 |
| `emailcode` | string | 否 | 注册用邮箱验证码（有 email 时必填） |
| `roleCodes` | string[] | 否 | 角色代码列表（可选，按 code 绑定） |

**响应**

- **201**: 

---

#### GET /admin/users

**管理员列表（GET，支持分页/搜索）**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `keyword` | query | string | 否 | 按 username/email/nickname 模糊搜索 |
| `status` | query | string | 否 | active|inactive|banned |
| `page` | query | string | 否 | 页码（默认1） |
| `pageSize` | query | string | 否 | 每页条数（默认20） |

**响应**

- **200**: 

---

#### POST /admin/users/detail

**管理员详情（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/users/update

**更新管理员资料（POST，目标管理员）**

🔐 **需要认证**

**响应**

- **201**: 

---

#### POST /admin/users/delete

**删除管理员（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/users/batch-delete

**批量删除管理员（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "ids": [
    1,
    2,
    3
  ]
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `ids` | string[] | 是 | 主键ID列表 |

**响应**

- **201**: 

---

#### POST /admin/users/assign-roles

**为管理员分配角色（POST，按 roleCodes 全量覆盖）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "userId": 1,
  "roleCodes": [
    "super_admin",
    "editor"
  ]
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `userId` | number | 是 | 管理员ID |
| `roleCodes` | string[] | 是 | 角色代码数组（全量覆盖） |

**响应**

- **201**: 

---

#### GET /admin/users/me

**我的信息（GET）**

🔐 **需要认证**

**响应**

- **200**: 

---

#### POST /admin/users/me/update

**更新我的资料（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "nickname": "string",
  "email": "string",
  "status": "active"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `nickname` | string | 否 | 昵称 |
| `email` | string | 否 | 邮箱 |
| `status` | enum(active|inactive|banned) | 否 | 状态 |

**响应**

- **201**: 

---

#### POST /admin/users/me/password

**修改我的密码（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "current": "Old@123456",
  "new": "New@123456"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `current` | string | 是 | 当前密码 |
| `new` | string | 是 | 新密码 |

**响应**

- **201**: 

---

### admin-roles

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/admin/roles/create` | 创建角色（POST） |
| `GET` | `/admin/roles` | 获取角色列表（GET） |
| `POST` | `/admin/roles/detail` | 根据ID获取角色（POST） |
| `POST` | `/admin/roles/update` | 更新角色（POST） |
| `POST` | `/admin/roles/delete` | 删除角色（POST） |
| `POST` | `/admin/roles/assign-permissions` | 为角色分配权限（POST） |
| `POST` | `/admin/roles/batch-delete` | 批量删除角色（POST） |

#### POST /admin/roles/create

**创建角色（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "name": "超级管理员",
  "code": "super_admin",
  "is_system": false,
  "description": "string",
  "permissionIds": []
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 是 | 角色名称 |
| `code` | string | 是 | 角色代码（唯一） |
| `is_system` | boolean | 否 | 是否系统内置 |
| `description` | string | 否 | 角色描述 |
| `permissionIds` | number[] | 否 | 初始权限ID列表 |

**响应**

- **201**: 角色创建成功

```json
{
  "id": 0,
  "name": "string",
  "code": "super_admin",
  "is_system": true,
  "description": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

---

#### GET /admin/roles

**获取角色列表（GET）**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `keyword` | query | string | 否 | 按 name/code 模糊搜索 |
| `page` | query | string | 否 | 页码（默认1） |
| `pageSize` | query | string | 否 | 每页条数（默认20） |

**响应**

- **200**: 返回角色列表

```json
[
  {
  "id": 0,
  "name": "string",
  "code": "super_admin",
  "is_system": true,
  "description": "string",
  "created_at": "string",
  "updated_at": "string"
}
]
```

---

#### POST /admin/roles/detail

**根据ID获取角色（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **200**: 返回角色信息

```json
{
  "id": 0,
  "name": "string",
  "code": "super_admin",
  "is_system": true,
  "description": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

---

#### POST /admin/roles/update

**更新角色（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 0,
  "name": "string",
  "code": "string",
  "is_system": true,
  "description": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 角色ID |
| `name` | string | 否 | 角色名称 |
| `code` | string | 否 | 角色代码（唯一） |
| `is_system` | boolean | 否 | 是否系统内置 |
| `description` | string | 否 | 角色描述 |

**响应**

- **200**: 角色更新成功

```json
{
  "id": 0,
  "name": "string",
  "code": "super_admin",
  "is_system": true,
  "description": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

---

#### POST /admin/roles/delete

**删除角色（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 0
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 角色ID |

**响应**

- **200**: 角色删除成功

---

#### POST /admin/roles/assign-permissions

**为角色分配权限（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "roleId": 1,
  "permissionIds": [
    1,
    2,
    3
  ]
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `roleId` | number | 是 | 角色ID |
| `permissionIds` | string[] | 是 | 权限ID数组 |

**响应**

- **200**: 权限分配成功

```json
{
  "id": 0,
  "name": "string",
  "code": "super_admin",
  "is_system": true,
  "description": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

---

#### POST /admin/roles/batch-delete

**批量删除角色（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "ids": [
    1,
    2,
    3
  ]
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `ids` | string[] | 是 | 主键ID列表 |

**响应**

- **201**: 

---

### admin-permissions

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/admin/permissions/create` | 创建权限（POST） |
| `GET` | `/admin/permissions` | 获取权限列表（GET） |
| `GET` | `/admin/permissions/{id}` | 根据ID获取权限（GET） |
| `POST` | `/admin/permissions/update` | 更新权限（POST） |
| `POST` | `/admin/permissions/delete` | 删除权限（POST） |
| `POST` | `/admin/permissions/batch-delete` | 批量删除权限（POST） |

#### POST /admin/permissions/create

**创建权限（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "name": "创建用户",
  "code": "user:create",
  "type": "api",
  "http_method": "GET",
  "http_path": "/admin/users/create",
  "description": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 是 | 权限名称 |
| `code` | string | 是 | 权限编码（唯一） |
| `type` | enum(api|menu|action) | 是 | 类型 |
| `http_method` | enum(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) | 否 | HTTP 方法（type=api 必填） |
| `http_path` | string | 否 | HTTP 路径（type=api 必填） |
| `description` | string | 否 | 描述 |

**响应**

- **201**: 权限创建成功

```json
{
  "name": "string",
  "code": "string",
  "type": "api",
  "http_method": "string",
  "http_path": "string",
  "description": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

---

#### GET /admin/permissions

**获取权限列表（GET）**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `keyword` | query | string | 否 | 按 name/code 模糊搜索 |
| `page` | query | string | 否 | 页码（默认1） |
| `pageSize` | query | string | 否 | 每页条数（默认20） |

**响应**

- **200**: 返回权限列表

```json
[
  {
  "name": "string",
  "code": "string",
  "type": "api",
  "http_method": "string",
  "http_path": "string",
  "description": "string",
  "created_at": "string",
  "updated_at": "string"
}
]
```

---

#### GET /admin/permissions/{id}

**根据ID获取权限（GET）**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `id` | path | number | 是 | - |

**响应**

- **200**: 返回权限信息

```json
{
  "name": "string",
  "code": "string",
  "type": "api",
  "http_method": "string",
  "http_path": "string",
  "description": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

---

#### POST /admin/permissions/update

**更新权限（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 0,
  "name": "string",
  "code": "string",
  "type": "api",
  "http_method": "GET",
  "http_path": "string",
  "description": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 权限ID |
| `name` | string | 否 | 权限名称 |
| `code` | string | 否 | 权限编码（如允许变更） |
| `type` | enum(api|menu|action) | 否 | 类型 |
| `http_method` | enum(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) | 否 | HTTP 方法（当最终 type=api 时需具备合法性） |
| `http_path` | string | 否 | HTTP 路径（当最终 type=api 时需具备合法性） |
| `description` | string | 否 | 描述 |

**响应**

- **200**: 权限更新成功

```json
{
  "name": "string",
  "code": "string",
  "type": "api",
  "http_method": "string",
  "http_path": "string",
  "description": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

---

#### POST /admin/permissions/delete

**删除权限（POST）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 0
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 权限ID |

**响应**

- **200**: 权限删除成功

---

#### POST /admin/permissions/batch-delete

**批量删除权限（POST）**

🔐 **需要认证**

**响应**

- **201**: 

---

### admin-credentials

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/admin/credentials/create` | 创建凭据（激活） |
| `GET` | `/admin/credentials` | 查询凭据列表（可按 appId 过滤） |
| `POST` | `/admin/credentials/update` | 更新凭据（状态/时间窗/IP 白名单等） |
| `POST` | `/admin/credentials/revoke` | 吊销凭据 |
| `POST` | `/admin/credentials/rotate` | 轮换密钥（新增 newKid 并可吊销旧的） |

#### POST /admin/credentials/create

**创建凭据（激活）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "appId": "string",
  "kid": "k1",
  "secret": "string",
  "alg": "sha256",
  "enc": "hex",
  "notBefore": "string",
  "expiresAt": "string",
  "allowIps": []
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `appId` | string | 是 | 应用ID |
| `kid` | string | 是 | 密钥ID |
| `secret` | string | 是 | HMAC 密钥明文（后端会加密存储） |
| `alg` | enum(sha256|sha512) | 是 | - |
| `enc` | enum(hex|base64) | 是 | - |
| `notBefore` | string | 否 | 生效时间（ISO8601） |
| `expiresAt` | string | 否 | 过期时间（ISO8601） |
| `allowIps` | string[] | 否 | IP 白名单 |

**响应**

- **201**: 

---

#### GET /admin/credentials

**查询凭据列表（可按 appId 过滤）**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `appId` | query | string | 是 | - |

**响应**

- **200**: 

---

#### POST /admin/credentials/update

**更新凭据（状态/时间窗/IP 白名单等）**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `appId` | query | string | 是 | - |
| `kid` | query | string | 是 | - |

**请求体**

Content-Type: `application/json`

```json
{
  "status": "active",
  "notBefore": "string",
  "expiresAt": "string",
  "allowIps": [],
  "description": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `status` | enum(active|inactive|revoked) | 否 | - |
| `notBefore` | string | 否 | 生效时间 |
| `expiresAt` | string | 否 | 过期时间 |
| `allowIps` | string[] | 否 | IP 白名单 |
| `description` | string | 否 | 备注 |

**响应**

- **201**: 

---

#### POST /admin/credentials/revoke

**吊销凭据**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "appId": "string",
  "kid": "string",
  "reason": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `appId` | string | 是 | 应用ID |
| `kid` | string | 是 | kid |
| `reason` | string | 否 | 原因 |

**响应**

- **201**: 

---

#### POST /admin/credentials/rotate

**轮换密钥（新增 newKid 并可吊销旧的）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "appId": "string",
  "newKid": "string",
  "newSecret": "string",
  "revokeOld": true,
  "oldKid": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `appId` | string | 是 | 应用ID |
| `newKid` | string | 是 | 新 kid（例如 k2） |
| `newSecret` | string | 是 | 新密钥明文 |
| `revokeOld` | boolean | 是 | 是否自动吊销旧密钥 |
| `oldKid` | string | 否 | 旧 kid（若需要显式指定） |

**响应**

- **201**: 

---

### admin-operation-log

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/admin/operation-logs` | 查询操作日志列表 |
| `POST` | `/admin/operation-logs/detail` | 查询操作日志详情 |
| `GET` | `/admin/operation-logs/stats` | 获取操作日志统计数据 |
| `GET` | `/admin/operation-logs/timeline` | 获取操作日志时间线 |
| `GET` | `/admin/operation-logs/by-admin` | 根据管理员ID查询操作日志 |
| `GET` | `/admin/operation-logs/by-target` | 根据目标对象查询操作日志 |
| `POST` | `/admin/operation-logs/cleanup` | 清理过期日志 |

#### GET /admin/operation-logs

**查询操作日志列表**

支持分页、多条件筛选和关键字搜索

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `page` | query | number | 否 | 页码，从 1 开始 |
| `pageSize` | query | number | 否 | 每页条数，默认 20，最大 200 |
| `adminId` | query | number | 否 | 管理员ID |
| `adminUsername` | query | string | 否 | 管理员用户名（模糊搜索） |
| `module` | query | string | 否 | 操作模块 |
| `action` | query | string | 否 | 操作动作 |
| `targetType` | query | string | 否 | 目标对象类型 |
| `targetId` | query | string | 否 | 目标对象ID |
| `success` | query | boolean | 否 | 是否操作成功 |
| `ip` | query | string | 否 | IP地址（模糊搜索） |
| `requestPath` | query | string | 否 | 请求路径（模糊搜索） |
| `startTime` | query | string | 否 | 开始时间（ISO 8601 格式） |
| `endTime` | query | string | 否 | 结束时间（ISO 8601 格式） |
| `keyword` | query | string | 否 | 关键字搜索（模糊匹配管理员用户名、描述、请求路径） |
| `sortBy` | query | string | 否 | 排序字段 |
| `sortOrder` | query | string | 否 | 排序方向 |

**响应**

- **200**: 查询成功

```json
{
  "total": 100,
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

---

#### POST /admin/operation-logs/detail

**查询操作日志详情**

根据日志ID查询完整的操作日志信息

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **200**: 查询成功

```json
{
  "id": 1,
  "adminId": 1,
  "adminUid": "adm_1234567890",
  "adminUsername": "admin",
  "module": "用户管理",
  "action": "CREATE",
  "description": "创建了用户 john_doe",
  "targetType": "USER",
  "targetId": "123",
  "httpMethod": "POST",
  "requestPath": "/admin/users/create",
  "ip": "192.168.1.100",
  "success": true,
  "errorCode": "USER_NOT_FOUND",
  "errorMessage": "用户不存在",
  "durationMs": 150,
  "createdAt": "2025-01-01T12:00:00.000Z",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "requestBody": {
    "username": "john_doe",
    "email": "***@example.com"
  },
  "responseBody": {
    "id": 1,
    "success": true
  },
  "changes": {
    "nickname": {
      "old": "张三",
      "new": "张三丰"
    }
  },
  "traceId": "trace-123456"
}
```

---

#### GET /admin/operation-logs/stats

**获取操作日志统计数据**

获取今日、本周、本月的操作统计，以及模块和动作维度的统计

🔐 **需要认证**

**响应**

- **200**: 查询成功

```json
{
  "todayCount": 100,
  "todaySuccessCount": 95,
  "todayFailCount": 5,
  "weekCount": 700,
  "monthCount": 3000,
  "moduleStats": [
    {
      "module": "用户管理",
      "count": 50
    },
    {
      "module": "角色管理",
      "count": 30
    }
  ],
  "actionStats": [
    {
      "action": "CREATE",
      "count": 20
    },
    {
      "action": "UPDATE",
      "count": 50
    }
  ]
}
```

---

#### GET /admin/operation-logs/timeline

**获取操作日志时间线**

获取最近N天的操作趋势数据

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `days` | query | string | 否 | 统计天数，默认7天，最大30天 |

**响应**

- **200**: 查询成功

```json
[
  {
  "time": "2025-01-01T00:00:00.000Z",
  "count": 10,
  "successCount": 9,
  "failCount": 1
}
]
```

---

#### GET /admin/operation-logs/by-admin

**根据管理员ID查询操作日志**

查询指定管理员的最近操作记录

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `adminId` | query | string | 是 | 管理员ID |
| `limit` | query | string | 否 | 返回记录数，默认20，最大100 |

**响应**

- **200**: 

---

#### GET /admin/operation-logs/by-target

**根据目标对象查询操作日志**

查询针对指定目标对象的操作记录

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `targetType` | query | string | 是 | 目标类型 |
| `targetId` | query | string | 是 | 目标ID |
| `limit` | query | string | 否 | 返回记录数，默认20，最大100 |

**响应**

- **200**: 

---

#### POST /admin/operation-logs/cleanup

**清理过期日志**

清理指定天数之前的操作日志，默认90天

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `days` | query | string | 否 | 保留天数，默认90天，最小30天 |

**响应**

- **201**: 

---

### admin-article

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/admin/articles/create` | 创建文章 |
| `GET` | `/admin/articles` | 查询文章列表 |
| `POST` | `/admin/articles/detail` | 查询文章详情 |
| `GET` | `/admin/articles/stats` | 获取文章统计数据 |
| `POST` | `/admin/articles/update` | 更新文章 |
| `POST` | `/admin/articles/publish` | 发布文章 |
| `POST` | `/admin/articles/offline` | 下线文章 |
| `POST` | `/admin/articles/set-top` | 设置/取消置顶 |
| `POST` | `/admin/articles/set-featured` | 设置/取消推荐 |
| `POST` | `/admin/articles/delete` | 删除文章（软删除） |
| `POST` | `/admin/articles/batch-delete` | 批量删除文章（软删除） |
| `POST` | `/admin/articles/restore` | 恢复已删除的文章 |

#### POST /admin/articles/create

**创建文章**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "title": "系统更新公告",
  "subTitle": "2025年1月重大更新",
  "summary": "本次更新包含多项功能改进...",
  "content": "# 更新内容\n\n## 新功能\n...",
  "contentFormat": "markdown",
  "coverUrl": "https://example.com/cover.jpg",
  "categoryId": 1,
  "categoryName": "公告",
  "tags": [
    "公告",
    "更新日志"
  ],
  "status": "draft",
  "isTop": false,
  "isFeatured": false,
  "sortOrder": 0,
  "seoTitle": "string",
  "seoKeywords": "string",
  "seoDescription": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `title` | string | 是 | 文章标题 |
| `subTitle` | string | 否 | 子标题 |
| `summary` | string | 否 | 摘要 |
| `content` | string | 是 | 文章正文内容 |
| `contentFormat` | enum(markdown|html|richtext) | 否 | 内容格式 |
| `coverUrl` | string | 否 | 封面图 URL |
| `categoryId` | number | 否 | 分类 ID |
| `categoryName` | string | 否 | 分类名称（冗余） |
| `tags` | string[] | 否 | 标签列表 |
| `status` | enum(draft|published|offline) | 否 | 文章状态 |
| `isTop` | boolean | 否 | 是否置顶 |
| `isFeatured` | boolean | 否 | 是否推荐 |
| `sortOrder` | number | 否 | 排序权重（越大越靠前） |
| `seoTitle` | string | 否 | SEO 标题 |
| `seoKeywords` | string | 否 | SEO 关键词 |
| `seoDescription` | string | 否 | SEO 描述 |

**响应**

- **201**: 创建成功

```json
{
  "id": 1,
  "uid": "art_abc123",
  "title": "系统更新公告",
  "subTitle": "2025年1月更新",
  "summary": "本次更新包含...",
  "coverUrl": "string",
  "categoryId": 0,
  "categoryName": "公告",
  "tags": [
    "公告",
    "更新"
  ],
  "status": "published",
  "isTop": false,
  "isFeatured": false,
  "sortOrder": 0,
  "viewCount": 100,
  "likeCount": 10,
  "createdBy": 0,
  "createdByUsername": "admin",
  "publishedAt": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "content": "string",
  "contentFormat": "markdown",
  "seoTitle": "string",
  "seoKeywords": "string",
  "seoDescription": "string",
  "createdByUid": "adm_123",
  "updatedBy": 0,
  "updatedByUid": "string",
  "updatedByUsername": "string",
  "isDeleted": false
}
```

---

#### GET /admin/articles

**查询文章列表**

支持分页、关键字搜索、多条件筛选

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `page` | query | number | 否 | 页码，从 1 开始 |
| `pageSize` | query | number | 否 | 每页条数，默认 20，最大 100 |
| `keyword` | query | string | 否 | 关键字搜索（标题、摘要） |
| `status` | query | string | 否 | 文章状态 |
| `categoryId` | query | number | 否 | 分类 ID |
| `isTop` | query | boolean | 否 | 是否置顶 |
| `isFeatured` | query | boolean | 否 | 是否推荐 |
| `createdBy` | query | number | 否 | 创建人 ID |
| `tag` | query | string | 否 | 标签（精确匹配） |
| `startTime` | query | string | 否 | 开始时间（ISO 8601） |
| `endTime` | query | string | 否 | 结束时间（ISO 8601） |
| `includeDeleted` | query | boolean | 否 | 是否包含已删除 |
| `sortBy` | query | string | 否 | 排序字段 |
| `sortOrder` | query | string | 否 | 排序方向 |

**响应**

- **200**: 查询成功

```json
{
  "total": 100,
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

---

#### POST /admin/articles/detail

**查询文章详情**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **200**: 查询成功

```json
{
  "id": 1,
  "uid": "art_abc123",
  "title": "系统更新公告",
  "subTitle": "2025年1月更新",
  "summary": "本次更新包含...",
  "coverUrl": "string",
  "categoryId": 0,
  "categoryName": "公告",
  "tags": [
    "公告",
    "更新"
  ],
  "status": "published",
  "isTop": false,
  "isFeatured": false,
  "sortOrder": 0,
  "viewCount": 100,
  "likeCount": 10,
  "createdBy": 0,
  "createdByUsername": "admin",
  "publishedAt": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "content": "string",
  "contentFormat": "markdown",
  "seoTitle": "string",
  "seoKeywords": "string",
  "seoDescription": "string",
  "createdByUid": "adm_123",
  "updatedBy": 0,
  "updatedByUid": "string",
  "updatedByUsername": "string",
  "isDeleted": false
}
```

---

#### GET /admin/articles/stats

**获取文章统计数据**

🔐 **需要认证**

**响应**

- **200**: 查询成功

```json
{
  "totalCount": 100,
  "draftCount": 20,
  "publishedCount": 70,
  "offlineCount": 10,
  "topCount": 5,
  "featuredCount": 10,
  "totalViewCount": 10000,
  "totalLikeCount": 500,
  "categoryStats": [
    {
      "categoryId": 1,
      "categoryName": "公告",
      "count": 30
    },
    {
      "categoryId": 2,
      "categoryName": "教程",
      "count": 20
    }
  ]
}
```

---

#### POST /admin/articles/update

**更新文章**

🔐 **需要认证**

**响应**

- **200**: 更新成功

```json
{
  "id": 1,
  "uid": "art_abc123",
  "title": "系统更新公告",
  "subTitle": "2025年1月更新",
  "summary": "本次更新包含...",
  "coverUrl": "string",
  "categoryId": 0,
  "categoryName": "公告",
  "tags": [
    "公告",
    "更新"
  ],
  "status": "published",
  "isTop": false,
  "isFeatured": false,
  "sortOrder": 0,
  "viewCount": 100,
  "likeCount": 10,
  "createdBy": 0,
  "createdByUsername": "admin",
  "publishedAt": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "content": "string",
  "contentFormat": "markdown",
  "seoTitle": "string",
  "seoKeywords": "string",
  "seoDescription": "string",
  "createdByUid": "adm_123",
  "updatedBy": 0,
  "updatedByUid": "string",
  "updatedByUsername": "string",
  "isDeleted": false
}
```

---

#### POST /admin/articles/publish

**发布文章**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **200**: 发布成功

```json
{
  "id": 1,
  "uid": "art_abc123",
  "title": "系统更新公告",
  "subTitle": "2025年1月更新",
  "summary": "本次更新包含...",
  "coverUrl": "string",
  "categoryId": 0,
  "categoryName": "公告",
  "tags": [
    "公告",
    "更新"
  ],
  "status": "published",
  "isTop": false,
  "isFeatured": false,
  "sortOrder": 0,
  "viewCount": 100,
  "likeCount": 10,
  "createdBy": 0,
  "createdByUsername": "admin",
  "publishedAt": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "content": "string",
  "contentFormat": "markdown",
  "seoTitle": "string",
  "seoKeywords": "string",
  "seoDescription": "string",
  "createdByUid": "adm_123",
  "updatedBy": 0,
  "updatedByUid": "string",
  "updatedByUsername": "string",
  "isDeleted": false
}
```

---

#### POST /admin/articles/offline

**下线文章**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **200**: 下线成功

```json
{
  "id": 1,
  "uid": "art_abc123",
  "title": "系统更新公告",
  "subTitle": "2025年1月更新",
  "summary": "本次更新包含...",
  "coverUrl": "string",
  "categoryId": 0,
  "categoryName": "公告",
  "tags": [
    "公告",
    "更新"
  ],
  "status": "published",
  "isTop": false,
  "isFeatured": false,
  "sortOrder": 0,
  "viewCount": 100,
  "likeCount": 10,
  "createdBy": 0,
  "createdByUsername": "admin",
  "publishedAt": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "content": "string",
  "contentFormat": "markdown",
  "seoTitle": "string",
  "seoKeywords": "string",
  "seoDescription": "string",
  "createdByUid": "adm_123",
  "updatedBy": 0,
  "updatedByUid": "string",
  "updatedByUsername": "string",
  "isDeleted": false
}
```

---

#### POST /admin/articles/set-top

**设置/取消置顶**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `isTop` | query | string | 是 | true=置顶, false=取消置顶 |

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **200**: 操作成功

```json
{
  "id": 1,
  "uid": "art_abc123",
  "title": "系统更新公告",
  "subTitle": "2025年1月更新",
  "summary": "本次更新包含...",
  "coverUrl": "string",
  "categoryId": 0,
  "categoryName": "公告",
  "tags": [
    "公告",
    "更新"
  ],
  "status": "published",
  "isTop": false,
  "isFeatured": false,
  "sortOrder": 0,
  "viewCount": 100,
  "likeCount": 10,
  "createdBy": 0,
  "createdByUsername": "admin",
  "publishedAt": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "content": "string",
  "contentFormat": "markdown",
  "seoTitle": "string",
  "seoKeywords": "string",
  "seoDescription": "string",
  "createdByUid": "adm_123",
  "updatedBy": 0,
  "updatedByUid": "string",
  "updatedByUsername": "string",
  "isDeleted": false
}
```

---

#### POST /admin/articles/set-featured

**设置/取消推荐**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `isFeatured` | query | string | 是 | true=推荐, false=取消推荐 |

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **200**: 操作成功

```json
{
  "id": 1,
  "uid": "art_abc123",
  "title": "系统更新公告",
  "subTitle": "2025年1月更新",
  "summary": "本次更新包含...",
  "coverUrl": "string",
  "categoryId": 0,
  "categoryName": "公告",
  "tags": [
    "公告",
    "更新"
  ],
  "status": "published",
  "isTop": false,
  "isFeatured": false,
  "sortOrder": 0,
  "viewCount": 100,
  "likeCount": 10,
  "createdBy": 0,
  "createdByUsername": "admin",
  "publishedAt": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "content": "string",
  "contentFormat": "markdown",
  "seoTitle": "string",
  "seoKeywords": "string",
  "seoDescription": "string",
  "createdByUid": "adm_123",
  "updatedBy": 0,
  "updatedByUid": "string",
  "updatedByUsername": "string",
  "isDeleted": false
}
```

---

#### POST /admin/articles/delete

**删除文章（软删除）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **200**: 删除成功

---

#### POST /admin/articles/batch-delete

**批量删除文章（软删除）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "ids": [
    1,
    2,
    3
  ]
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `ids` | string[] | 是 | 主键ID列表 |

**响应**

- **200**: 删除成功

---

#### POST /admin/articles/restore

**恢复已删除的文章**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **200**: 恢复成功

```json
{
  "id": 1,
  "uid": "art_abc123",
  "title": "系统更新公告",
  "subTitle": "2025年1月更新",
  "summary": "本次更新包含...",
  "coverUrl": "string",
  "categoryId": 0,
  "categoryName": "公告",
  "tags": [
    "公告",
    "更新"
  ],
  "status": "published",
  "isTop": false,
  "isFeatured": false,
  "sortOrder": 0,
  "viewCount": 100,
  "likeCount": 10,
  "createdBy": 0,
  "createdByUsername": "admin",
  "publishedAt": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "content": "string",
  "contentFormat": "markdown",
  "seoTitle": "string",
  "seoKeywords": "string",
  "seoDescription": "string",
  "createdByUid": "adm_123",
  "updatedBy": 0,
  "updatedByUid": "string",
  "updatedByUsername": "string",
  "isDeleted": false
}
```

---

### 模块配置管理

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/admin/module-config/create` | 创建配置项 |
| `GET` | `/admin/module-config/list` | 分页查询配置列表 |
| `GET` | `/admin/module-config/stats` | 获取配置统计数据 |
| `GET` | `/admin/module-config/grouped` | 按模块分组获取所有配置 |
| `GET` | `/admin/module-config/module/{moduleCode}` | 获取指定模块的所有配置 |
| `GET` | `/admin/module-config/module/{moduleCode}/values` | 获取指定模块的所有配置值（键值对） |
| `GET` | `/admin/module-config/key/{moduleCode}/{itemKey}` | 根据 moduleCode + itemKey 查询配置 |
| `GET` | `/admin/module-config/uid/{uid}` | 根据 UID 查询配置详情 |
| `POST` | `/admin/module-config/detail` | 根据 ID 查询配置详情 |
| `POST` | `/admin/module-config/update` | 更新配置项 |
| `POST` | `/admin/module-config/update-value` | 更新配置值（简化接口） |
| `POST` | `/admin/module-config/enable` | 启用配置项 |
| `POST` | `/admin/module-config/disable` | 禁用配置项 |
| `POST` | `/admin/module-config/reset` | 重置为默认值 |
| `POST` | `/admin/module-config/restore` | 恢复已删除的配置项 |
| `POST` | `/admin/module-config/delete` | 删除配置项（软删除） |
| `POST` | `/admin/module-config/batch-delete` | 批量删除配置项 |

#### POST /admin/module-config/create

**创建配置项**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "moduleCode": "article",
  "moduleName": "文章管理",
  "itemKey": "max_article_count",
  "itemName": "最大文章数量",
  "itemType": "switch",
  "value": "100",
  "defaultValue": "50",
  "options": [],
  "status": "enabled",
  "description": "string",
  "remark": "string",
  "sortOrder": 0,
  "isSystem": false
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `moduleCode` | string | 是 | 模块编码 |
| `moduleName` | string | 否 | 模块名称 |
| `itemKey` | string | 是 | 配置项 key |
| `itemName` | string | 否 | 配置项名称 |
| `itemType` | enum(switch|number|text|json|select|multiselect) | 否 | 配置项类型 |
| `value` | string | 是 | 配置值 |
| `defaultValue` | string | 否 | 默认值 |
| `options` | [ConfigOptionDto](#configoptiondto)[] | 否 | 可选值列表（用于 select/multiselect 类型） |
| `status` | enum(enabled|disabled) | 否 | 状态 |
| `description` | string | 否 | 配置项说明 |
| `remark` | string | 否 | 配置项备注（内部使用） |
| `sortOrder` | number | 否 | 排序权重（越大越靠前） |
| `isSystem` | boolean | 否 | 是否系统内置 |

**响应**

- **201**: 

---

#### GET /admin/module-config/list

**分页查询配置列表**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `page` | query | number | 否 | 页码，从 1 开始 |
| `pageSize` | query | number | 否 | 每页条数，默认 20，最大 100 |
| `moduleCode` | query | string | 否 | 模块编码 |
| `itemKey` | query | string | 否 | 配置项 key（精确匹配） |
| `itemType` | query | string | 否 | 配置项类型 |
| `status` | query | string | 否 | 状态 |
| `keyword` | query | string | 否 | 关键字搜索（模块名称、配置项名称、描述） |
| `includeDeleted` | query | boolean | 否 | 是否包含已删除 |
| `sortBy` | query | string | 否 | 排序字段 |
| `sortOrder` | query | string | 否 | 排序方向 |

**响应**

- **200**: 

---

#### GET /admin/module-config/stats

**获取配置统计数据**

🔐 **需要认证**

**响应**

- **200**: 

---

#### GET /admin/module-config/grouped

**按模块分组获取所有配置**

🔐 **需要认证**

**响应**

- **200**: 

---

#### GET /admin/module-config/module/{moduleCode}

**获取指定模块的所有配置**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `moduleCode` | path | string | 是 | 模块编码 |

**响应**

- **200**: 

---

#### GET /admin/module-config/module/{moduleCode}/values

**获取指定模块的所有配置值（键值对）**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `moduleCode` | path | string | 是 | 模块编码 |

**响应**

- **200**: 

---

#### GET /admin/module-config/key/{moduleCode}/{itemKey}

**根据 moduleCode + itemKey 查询配置**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `moduleCode` | path | string | 是 | 模块编码 |
| `itemKey` | path | string | 是 | 配置项 key |

**响应**

- **200**: 

---

#### GET /admin/module-config/uid/{uid}

**根据 UID 查询配置详情**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `uid` | path | string | 是 | 配置 UID |

**响应**

- **200**: 

---

#### POST /admin/module-config/detail

**根据 ID 查询配置详情**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/module-config/update

**更新配置项**

🔐 **需要认证**

**响应**

- **201**: 

---

#### POST /admin/module-config/update-value

**更新配置值（简化接口）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 0,
  "value": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 配置 ID |
| `value` | string | 是 | 配置值 |

**响应**

- **201**: 

---

#### POST /admin/module-config/enable

**启用配置项**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/module-config/disable

**禁用配置项**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/module-config/reset

**重置为默认值**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/module-config/restore

**恢复已删除的配置项**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/module-config/delete

**删除配置项（软删除）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/module-config/batch-delete

**批量删除配置项**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "ids": [
    1,
    2,
    3
  ]
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `ids` | string[] | 是 | 主键ID列表 |

**响应**

- **201**: 

---

### 问卷管理

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/admin/survey/create` | 创建问卷 |
| `POST` | `/admin/survey/duplicate` | 复制问卷 |
| `GET` | `/admin/survey/list` | 分页查询问卷列表 |
| `GET` | `/admin/survey/stats` | 获取问卷统计数据 |
| `GET` | `/admin/survey/uid/{uid}` | 根据 UID 查询问卷详情 |
| `POST` | `/admin/survey/detail` | 根据 ID 查询问卷详情 |
| `POST` | `/admin/survey/update` | 更新问卷 |
| `POST` | `/admin/survey/activate` | 发布问卷（开始收集） |
| `POST` | `/admin/survey/close` | 关闭问卷（停止收集） |
| `POST` | `/admin/survey/archive` | 归档问卷 |
| `POST` | `/admin/survey/unarchive` | 取消归档 |
| `POST` | `/admin/survey/restore` | 恢复已删除的问卷 |
| `POST` | `/admin/survey/delete` | 删除问卷（软删除） |
| `POST` | `/admin/survey/batch-delete` | 批量删除问卷 |

#### POST /admin/survey/create

**创建问卷**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "title": {
    "zhCN": "用户满意度调查",
    "enUS": "User Satisfaction Survey"
  },
  "description": {
    "zhCN": "请填写您的真实感受",
    "enUS": "Please share your experience"
  },
  "topics": {},
  "endMessage": {
    "zhCN": "感谢您的参与！",
    "enUS": "Thank you for your participation!"
  },
  "languagesList": [
    "zhCN",
    "enUS"
  ],
  "themeColor": "#409EFF",
  "status": "draft",
  "loginRequired": false,
  "answerLimitDate": false,
  "showQuestionIndex": true,
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": "2024-12-31T23:59:59.000Z",
  "datetimeRange": [],
  "maxSubmitTimesPerUser": 0,
  "requireGameBinding": false,
  "sortOrder": 0,
  "categoryId": 1,
  "categoryName": "用户调研"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `title` | object | 是 | 问卷标题（多语言 JSON） |
| `description` | object | 否 | 问卷描述（多语言 JSON） |
| `topics` | object | 否 | 问卷结构（题目列表配置 JSON schema） |
| `endMessage` | object | 否 | 答卷结束提示语（多语言 JSON） |
| `languagesList` | string[] | 否 | 启用的多语言列表 |
| `themeColor` | string | 否 | 主题主色 |
| `status` | enum(draft|active|closed) | 否 | 状态 |
| `loginRequired` | boolean | 否 | 是否需要登录才可答题 |
| `answerLimitDate` | boolean | 否 | 是否限制答题时间 |
| `showQuestionIndex` | boolean | 否 | 是否显示题目编号 |
| `startTime` | string | 否 | 问卷开始时间 |
| `endTime` | string | 否 | 问卷截止时间 |
| `datetimeRange` | string[] | 否 | 时间范围 [start, end] |
| `maxSubmitTimesPerUser` | number | 否 | 每个用户最多可提交次数（0 表示不限制） |
| `requireGameBinding` | boolean | 否 | 是否要求填写前绑定游戏账号 |
| `sortOrder` | number | 否 | 排序权重（数字越大越靠前） |
| `categoryId` | number | 否 | 分类 ID（关联 admin_categories） |
| `categoryName` | string | 否 | 分类名称（冗余，便于展示） |

**响应**

- **201**: 

---

#### POST /admin/survey/duplicate

**复制问卷**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### GET /admin/survey/list

**分页查询问卷列表**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `page` | query | number | 否 | 页码，从 1 开始 |
| `pageSize` | query | number | 否 | 每页条数，默认 20，最大 100 |
| `status` | query | string | 否 | 状态 |
| `isArchived` | query | boolean | 否 | 是否已归档 |
| `createdBy` | query | number | 否 | 创建人 ID |
| `categoryId` | query | number | 否 | 分类 ID |
| `keyword` | query | string | 否 | 关键字搜索（标题） |
| `startTime` | query | string | 否 | 开始时间（创建时间范围） |
| `endTime` | query | string | 否 | 结束时间（创建时间范围） |
| `includeDeleted` | query | boolean | 否 | 是否包含已删除 |
| `sortBy` | query | string | 否 | 排序字段 |
| `sortOrder` | query | string | 否 | 排序方向 |

**响应**

- **200**: 

---

#### GET /admin/survey/stats

**获取问卷统计数据**

🔐 **需要认证**

**响应**

- **200**: 

---

#### GET /admin/survey/uid/{uid}

**根据 UID 查询问卷详情**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `uid` | path | string | 是 | 问卷 UID |

**响应**

- **200**: 

---

#### POST /admin/survey/detail

**根据 ID 查询问卷详情**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/survey/update

**更新问卷**

🔐 **需要认证**

**响应**

- **201**: 

---

#### POST /admin/survey/activate

**发布问卷（开始收集）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/survey/close

**关闭问卷（停止收集）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/survey/archive

**归档问卷**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 0,
  "archiveCategoryId": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 问卷 ID |
| `archiveCategoryId` | string | 否 | 归档分类 ID |

**响应**

- **201**: 

---

#### POST /admin/survey/unarchive

**取消归档**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/survey/restore

**恢复已删除的问卷**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/survey/delete

**删除问卷（软删除）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "id": 1
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

**响应**

- **201**: 

---

#### POST /admin/survey/batch-delete

**批量删除问卷**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "ids": [
    1,
    2,
    3
  ]
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `ids` | string[] | 是 | 主键ID列表 |

**响应**

- **201**: 

---

### 分类管理

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/admin/category/create` | 创建分类 |
| `GET` | `/admin/category/list` | 分页查询分类列表 |
| `GET` | `/admin/category/stats` | 获取分类统计数据 |
| `GET` | `/admin/category/tree/{moduleCode}` | 获取指定模块的分类树 |
| `GET` | `/admin/category/options/{moduleCode}` | 获取分类选项列表（用于下拉选择） |
| `GET` | `/admin/category/slug/{moduleCode}/{slug}` | 根据模块和 slug 查询分类 |
| `GET` | `/admin/category/uid/{uid}` | 根据 UID 查询分类详情 |
| `GET` | `/admin/category/detail/{id}` | 根据 ID 查询分类详情 |
| `POST` | `/admin/category/update/{id}` | 更新分类 |
| `POST` | `/admin/category/enable/{id}` | 启用分类 |
| `POST` | `/admin/category/disable/{id}` | 禁用分类 |
| `POST` | `/admin/category/move/{id}` | 移动分类（更改父分类） |
| `POST` | `/admin/category/restore/{id}` | 恢复已删除的分类 |
| `POST` | `/admin/category/delete/{id}` | 删除分类（软删除） |
| `POST` | `/admin/category/batch-delete` | 批量删除分类（只删除叶子节点） |

#### POST /admin/category/create

**创建分类**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "moduleCode": "article",
  "name": "技术文章",
  "slug": "tech-articles",
  "description": "string",
  "icon": "string",
  "coverUrl": "string",
  "parentId": 1,
  "sortOrder": 0,
  "status": "enabled"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `moduleCode` | string | 是 | 模块编码 |
| `name` | string | 是 | 分类名称 |
| `slug` | string | 是 | URL 标识（同一模块内唯一） |
| `description` | string | 否 | 分类描述 |
| `icon` | string | 否 | 图标 |
| `coverUrl` | string | 否 | 封面图 URL |
| `parentId` | number | 否 | 父分类 ID |
| `sortOrder` | number | 否 | 排序权重（越大越靠前） |
| `status` | enum(enabled|disabled) | 否 | 状态 |

**响应**

- **201**: 

---

#### GET /admin/category/list

**分页查询分类列表**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `page` | query | number | 否 | 页码，从 1 开始 |
| `pageSize` | query | number | 否 | 每页条数，默认 20，最大 100 |
| `moduleCode` | query | string | 否 | 模块编码 |
| `parentId` | query | number | 否 | 父分类 ID（传 0 或 null 查询根分类） |
| `status` | query | string | 否 | 状态 |
| `keyword` | query | string | 否 | 关键字搜索（名称） |
| `includeDeleted` | query | boolean | 否 | 是否包含已删除 |
| `sortBy` | query | string | 否 | 排序字段 |
| `sortOrder` | query | string | 否 | 排序方向 |

**响应**

- **200**: 

---

#### GET /admin/category/stats

**获取分类统计数据**

🔐 **需要认证**

**响应**

- **200**: 

---

#### GET /admin/category/tree/{moduleCode}

**获取指定模块的分类树**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `moduleCode` | path | string | 是 | 模块编码 |
| `onlyEnabled` | query | string | 是 | - |

**响应**

- **200**: 

---

#### GET /admin/category/options/{moduleCode}

**获取分类选项列表（用于下拉选择）**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `moduleCode` | path | string | 是 | 模块编码 |

**响应**

- **200**: 

---

#### GET /admin/category/slug/{moduleCode}/{slug}

**根据模块和 slug 查询分类**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `moduleCode` | path | string | 是 | 模块编码 |
| `slug` | path | string | 是 | URL 标识 |

**响应**

- **200**: 

---

#### GET /admin/category/uid/{uid}

**根据 UID 查询分类详情**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `uid` | path | string | 是 | 分类 UID |

**响应**

- **200**: 

---

#### GET /admin/category/detail/{id}

**根据 ID 查询分类详情**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `id` | path | number | 是 | 分类 ID |

**响应**

- **200**: 

---

#### POST /admin/category/update/{id}

**更新分类**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `id` | path | number | 是 | 分类 ID |

**请求体**

Content-Type: `application/json`

```json
{
  "name": "string",
  "slug": "string",
  "description": "string",
  "icon": "string",
  "coverUrl": "string",
  "parentId": 0,
  "sortOrder": 0,
  "status": "enabled"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 否 | 分类名称 |
| `slug` | string | 否 | URL 标识 |
| `description` | string | 否 | 分类描述 |
| `icon` | string | 否 | 图标 |
| `coverUrl` | string | 否 | 封面图 URL |
| `parentId` | number | 否 | 父分类 ID |
| `sortOrder` | number | 否 | 排序权重 |
| `status` | enum(enabled|disabled) | 否 | 状态 |

**响应**

- **201**: 

---

#### POST /admin/category/enable/{id}

**启用分类**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `id` | path | number | 是 | 分类 ID |

**响应**

- **201**: 

---

#### POST /admin/category/disable/{id}

**禁用分类**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `id` | path | number | 是 | 分类 ID |

**响应**

- **201**: 

---

#### POST /admin/category/move/{id}

**移动分类（更改父分类）**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `id` | path | number | 是 | 分类 ID |

**请求体**

Content-Type: `application/json`

```json
{
  "parentId": 0
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `parentId` | number | 否 | 新的父分类 ID，null 表示移动到根级 |

**响应**

- **201**: 

---

#### POST /admin/category/restore/{id}

**恢复已删除的分类**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `id` | path | number | 是 | 分类 ID |

**响应**

- **201**: 

---

#### POST /admin/category/delete/{id}

**删除分类（软删除）**

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `id` | path | number | 是 | 分类 ID |

**响应**

- **201**: 

---

#### POST /admin/category/batch-delete

**批量删除分类（只删除叶子节点）**

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "ids": []
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `ids` | number[] | 否 | - |

**响应**

- **201**: 

---

### 问卷响应 - 用户端

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/survey-response/submit` | 提交问卷响应 |
| `GET` | `/survey-response/my-list` | 查询我的响应列表 |
| `GET` | `/survey-response/detail/{uid}` | 查询响应详情 |
| `GET` | `/survey-response/status/{surveyUid}` | 查询问卷提交状态 |
| `POST` | `/survey-response/update/{uid}` | 更新响应 |
| `POST` | `/survey-response/delete/{uid}` | 删除响应 |

#### POST /survey-response/submit

**提交问卷响应**

提交问卷答案，需要登录。如果问卷设置了登录必填，则必须登录后才能提交。

🔐 **需要认证**

**请求体**

Content-Type: `application/json`

```json
{
  "surveyUid": "srv_123456789012",
  "answers": {
    "q1": "A",
    "q2": [
      "B",
      "C"
    ],
    "q3": "这是我的回答"
  },
  "durationSeconds": 120,
  "locale": "zhCN",
  "surveyLanguage": "zhCN",
  "referrer": "string",
  "nickname": "Player123",
  "guid": "guid_abc123",
  "gamelink": {
    "platform": "steam",
    "region": "AS",
    "uid": "76561198012345678"
  },
  "email": "user@example.com",
  "timeZone": "Asia/Shanghai"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `surveyUid` | string | 是 | 问卷 UID |
| `answers` | object | 是 | 问卷答案（JSON 对象，key 为题目 ID，value 为答案） |
| `durationSeconds` | number | 否 | 填写时长（秒） |
| `locale` | string | 否 | 提交者所选语言（如 zhCN, enUS） |
| `surveyLanguage` | string | 否 | 提交时使用的问卷语言 |
| `referrer` | string | 否 | 来源 Referrer |
| `nickname` | string | 否 | 用户昵称（自填） |
| `guid` | string | 否 | 用户 KID/GUID（游戏账号标识） |
| `gamelink` | object | 否 | 用户游戏链接信息 |
| `email` | string | 否 | 用户邮箱（自填） |
| `timeZone` | string | 否 | 提交者时区 |

**响应**

- **201**: 提交成功

```json
{
  "success": true,
  "responseUid": "rsp_123456789012",
  "message": "string"
}
```

---

#### GET /survey-response/my-list

**查询我的响应列表**

查询当前登录用户的所有问卷响应

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `page` | query | number | 否 | 页码，从 1 开始 |
| `pageSize` | query | number | 否 | 每页条数，默认 20，最大 100 |
| `surveyUid` | query | string | 否 | 问卷 UID |
| `status` | query | string | 否 | 响应状态 |
| `isEffective` | query | boolean | 否 | 是否有效 |

**响应**

- **200**: 返回响应列表

```json
{
  "total": 100,
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

---

#### GET /survey-response/detail/{uid}

**查询响应详情**

根据响应 UID 查询详情，只能查看自己的响应

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `uid` | path | string | 是 | 响应 UID |

**响应**

- **200**: 返回响应详情

```json
{
  "id": 1,
  "uid": "rsp_123456789012",
  "surveyUid": "srv_123456789012",
  "status": "submitted",
  "isEffective": true,
  "durationSeconds": 0,
  "locale": "string",
  "createdAt": "string",
  "answers": {},
  "surveyLanguage": "string",
  "updatedAt": "string"
}
```

---

#### GET /survey-response/status/{surveyUid}

**查询问卷提交状态**

查询当前用户在指定问卷的提交状态（是否已提交、提交次数等）

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `surveyUid` | path | string | 是 | 问卷 UID |

**响应**

- **200**: 返回提交状态

```json
{
  "surveyUid": "string",
  "hasSubmitted": false,
  "submitCount": 0,
  "maxSubmitTimes": 0,
  "canSubmit": true,
  "lastResponseUid": "string",
  "lastSubmitTime": "string"
}
```

---

#### POST /survey-response/update/{uid}

**更新响应**

更新问卷响应，只能更新自己的响应，且仅限 submitted 状态

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `uid` | path | string | 是 | 响应 UID |

**请求体**

Content-Type: `application/json`

```json
{
  "answers": {},
  "nickname": "string",
  "guid": "string",
  "gamelink": {},
  "email": "string"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `answers` | object | 否 | 问卷答案（JSON 对象） |
| `nickname` | string | 否 | 用户昵称 |
| `guid` | string | 否 | 用户 KID/GUID |
| `gamelink` | object | 否 | 游戏链接信息 |
| `email` | string | 否 | 用户邮箱 |

**响应**

- **200**: 更新成功

```json
{
  "id": 1,
  "uid": "rsp_123456789012",
  "surveyUid": "srv_123456789012",
  "status": "submitted",
  "isEffective": true,
  "durationSeconds": 0,
  "locale": "string",
  "createdAt": "string",
  "answers": {},
  "surveyLanguage": "string",
  "updatedAt": "string"
}
```

---

#### POST /survey-response/delete/{uid}

**删除响应**

删除问卷响应（软删除），只能删除自己的响应，且仅限 submitted 状态

🔐 **需要认证**

**请求参数**

| 参数名 | 位置 | 类型 | 必填 | 描述 |
|--------|------|------|------|------|
| `uid` | path | string | 是 | 响应 UID |

**响应**

- **200**: 删除成功

---

### 问卷响应 - 匿名提交

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/survey-response/anonymous/submit` | 匿名提交问卷 |

#### POST /survey-response/anonymous/submit

**匿名提交问卷**

匿名提交问卷答案。如果问卷设置了登录必填，则会返回 403 错误。

**请求体**

Content-Type: `application/json`

```json
{
  "surveyUid": "srv_123456789012",
  "answers": {
    "q1": "A",
    "q2": [
      "B",
      "C"
    ],
    "q3": "这是我的回答"
  },
  "durationSeconds": 120,
  "locale": "zhCN",
  "surveyLanguage": "zhCN",
  "referrer": "string",
  "nickname": "Player123",
  "guid": "guid_abc123",
  "gamelink": {
    "platform": "steam",
    "region": "AS",
    "uid": "76561198012345678"
  },
  "email": "user@example.com",
  "timeZone": "Asia/Shanghai"
}
```

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `surveyUid` | string | 是 | 问卷 UID |
| `answers` | object | 是 | 问卷答案（JSON 对象，key 为题目 ID，value 为答案） |
| `durationSeconds` | number | 否 | 填写时长（秒） |
| `locale` | string | 否 | 提交者所选语言（如 zhCN, enUS） |
| `surveyLanguage` | string | 否 | 提交时使用的问卷语言 |
| `referrer` | string | 否 | 来源 Referrer |
| `nickname` | string | 否 | 用户昵称（自填） |
| `guid` | string | 否 | 用户 KID/GUID（游戏账号标识） |
| `gamelink` | object | 否 | 用户游戏链接信息 |
| `email` | string | 否 | 用户邮箱（自填） |
| `timeZone` | string | 否 | 提交者时区 |

**响应**

- **201**: 提交成功

```json
{
  "success": true,
  "responseUid": "rsp_123456789012",
  "message": "string"
}
```

---

---

## 数据模型

### SecurityMetricsResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `failedLogins` | number | 是 | 失败登录次数 |
| `signatureFailures` | number | 是 | 签名验证失败次数 |
| `rateLimitHits` | number | 是 | 限流触发次数 |
| `suspiciousActivities` | number | 是 | 可疑活动次数 |
| `windowMinutes` | number | 是 | 查询时间窗口（分钟） |

### BlacklistEntryResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `ip` | string | 是 | IP地址 |
| `reason` | string | 是 | 封禁原因 |
| `expiresAt` | number | 否 | 过期时间戳 |
| `createdAt` | number | 是 | 创建时间戳 |
| `createdBy` | string | 否 | 创建者 |

### AddToBlacklistDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `ip` | string | 是 | IP地址 |
| `reason` | string | 是 | 封禁原因 |
| `expiresAt` | number | 否 | 过期时间戳（毫秒），不填则永久封禁 |
| `createdBy` | string | 否 | 创建者标识 |

### SuccessResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `success` | boolean | 是 | 操作是否成功 |

### AutoBlacklistDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `reason` | string | 是 | 封禁原因 |
| `durationHours` | number | 否 | 封禁时长（小时），默认24小时 |

### CleanupResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `success` | boolean | 是 | 操作是否成功 |
| `cleanedEntries` | number | 是 | 清理的黑名单条目数 |
| `cleanedEvents` | number | 是 | 清理的安全事件数 |

### SuspiciousCheckResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `suspicious` | boolean | 是 | IP是否可疑 |
| `metrics` | any | 是 | 安全指标详情 |

### SecurityOverviewResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `blacklist` | object | 是 | 黑名单统计 |
| `metrics` | any | 是 | 安全指标 |
| `timestamp` | number | 是 | 时间戳 |

### SlowQueryRecordResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `sql` | string | 是 | 查询SQL（已脱敏） |
| `duration` | number | 是 | 执行时间（毫秒） |
| `params` | string[] | 否 | 查询参数 |
| `timestamp` | number | 是 | 记录时间戳 |
| `source` | string | 否 | 来源模块 |
| `userId` | number | 否 | 用户ID |
| `ip` | string | 否 | IP地址 |

### QueryStatsResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `totalQueries` | number | 是 | 总查询次数 |
| `slowQueries` | number | 是 | 慢查询次数 |
| `avgDuration` | number | 是 | 平均执行时间（毫秒） |
| `maxDuration` | number | 是 | 最大执行时间（毫秒） |
| `slowestQueries` | [SlowQueryRecordResponse](#slowqueryrecordresponse)[] | 是 | 最慢的查询列表 |

### CacheStatsResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `totalKeys` | number | 是 | 缓存键总数 |
| `memoryUsage` | string | 是 | 内存使用量 |
| `hitRate` | number | 否 | 缓存命中率 |

### CacheClearResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `success` | boolean | 是 | 操作是否成功 |
| `clearedKeys` | number | 是 | 清理的键数量 |

### SlowQueryCleanupResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `success` | boolean | 是 | 操作是否成功 |
| `cleanedCount` | number | 是 | 清理的记录数量 |

### StatsResetResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `success` | boolean | 是 | 操作是否成功 |

### DatabaseOverviewResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `queryStats` | any | 是 | 查询统计 |
| `cacheStats` | any | 是 | 缓存统计 |
| `slowestQueries` | [SlowQueryRecordResponse](#slowqueryrecordresponse)[] | 是 | 最慢查询 |
| `timestamp` | number | 是 | 时间戳 |

### CreateAlertRuleDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 是 | 规则名称 |
| `metric` | string | 是 | 监控指标名称 |
| `threshold` | number | 是 | 阈值 |
| `operator` | enum(gt|lt|eq|gte|lte) | 是 | 比较操作符 |
| `duration` | number | 是 | 持续时间（秒） |
| `severity` | enum(low|medium|high|critical) | 是 | 告警级别 |
| `enabled` | boolean | 是 | 是否启用 |
| `channels` | enum(email|sms|webhook|slack)[] | 是 | 通知渠道 |
| `recipients` | string[] | 是 | 通知接收者（邮箱或ID列表） |

### RuleCreateResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `ruleId` | string | 是 | 规则ID |

### UpdateAlertRuleDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 否 | 规则名称 |
| `threshold` | number | 否 | 阈值 |
| `operator` | enum(gt|lt|eq|gte|lte) | 否 | 比较操作符 |
| `duration` | number | 否 | 持续时间（秒） |
| `severity` | enum(low|medium|high|critical) | 否 | 告警级别 |
| `enabled` | boolean | 否 | 是否启用 |
| `channels` | enum(email|sms|webhook|slack)[] | 否 | 通知渠道 |
| `recipients` | string[] | 否 | 通知接收者 |

### ResolveAlertDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `resolution` | string | 是 | 解决方案描述 |

### CheckMetricsDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `metric` | string | 是 | 指标名称 |
| `value` | number | 是 | 指标值 |

### MonitoringOverviewResponse

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `system` | object | 是 | 系统状态 |
| `application` | object | 是 | 应用状态 |
| `health` | object | 是 | 健康状态 |
| `business` | object | 是 | 业务指标 |
| `alerts` | object | 是 | 告警统计 |
| `timestamp` | number | 是 | 时间戳 |

### SendEmailCodeDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `email` | string | 是 | - |
| `scene` | enum(register|login|reset) | 是 | - |

### LoginDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `account` | string | 是 | 登录账号（邮箱或用户名） |
| `password` | string | 是 | 密码 |
| `deviceId` | string | 否 | 设备ID（指纹或本地生成） |
| `deviceName` | string | 否 | 设备名 |
| `platform` | enum(ios|android|web|desktop) | 否 | 平台 |

### CreateUserDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `username` | string | 否 | 用户名 |
| `email` | string | 否 | 邮箱地址 |
| `emailcode` | string | 否 | 注册用邮箱验证码（有 email 时必填） |
| `phone` | string | 否 | 手机号（含区号） |
| `password` | string | 是 | 密码 |
| `nickname` | string | 否 | 昵称 |

### MFASetupDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|

### MFAVerifyDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|

### PasswordCheckDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|

### AlertSettingsDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|

### UpdateUserDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `nickname` | string | 否 | 昵称 |
| `avatar_url` | string | 否 | 头像 URL |
| `gender` | enum(unknown|male|female|other) | 否 | 性别 |
| `birthday` | string | 否 | 生日（YYYY-MM-DD） |
| `country` | string | 否 | 国家/地区码（ISO 3166-1 alpha-2） |
| `locale` | string | 否 | 语言（如 zh-CN） |
| `time_zone` | string | 否 | 时区（IANA） |
| `marketing_consent` | boolean | 否 | 营销/通知同意 |

### ChangePasswordDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `current` | string | 是 | 当前密码 |
| `new` | string | 是 | 新密码 |

### WechatMpLoginDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `code` | string | 是 | wx.login 返回的 code |
| `encryptedData` | string | 否 | wx.getUserInfo/手机授权返回的 encryptedData（可选用于拿 unionId） |
| `iv` | string | 否 | 配套 IV（可选） |

### UploadImageResponseDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | 是 | 文件ID |
| `filename` | string | 是 | 文件名 |
| `originalName` | string | 是 | 原始文件名 |
| `size` | number | 是 | 文件大小（字节） |
| `mimeType` | string | 是 | 文件类型 |
| `url` | string | 是 | 访问URL |
| `uploadedAt` | string(date-time) | 是 | 上传时间 |

### FileListResponseDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `items` | string[] | 是 | 文件列表 |
| `total` | number | 是 | 总数 |
| `page` | number | 是 | 当前页 |
| `pageSize` | number | 是 | 每页数量 |

### PublicArticleListItemVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `uid` | string | 是 | 文章 UID |
| `title` | string | 是 | 标题 |
| `subTitle` | string | 否 | 子标题 |
| `summary` | string | 是 | 摘要 |
| `coverUrl` | string | 否 | 封面图 URL |
| `categoryId` | number | 否 | 分类 ID |
| `categoryName` | string | 是 | 分类名称 |
| `tags` | string[] | 否 | 标签 |
| `isTop` | boolean | 是 | 是否置顶 |
| `isFeatured` | boolean | 是 | 是否推荐 |
| `viewCount` | number | 是 | 阅读量 |
| `likeCount` | number | 是 | 点赞数 |
| `publishedAt` | string | 否 | 发布时间（ISO 8601） |

### PublicArticleListVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `total` | number | 是 | 总记录数 |
| `items` | [PublicArticleListItemVO](#publicarticlelistitemvo)[] | 是 | 文章列表 |
| `page` | number | 是 | 当前页码 |
| `pageSize` | number | 是 | 每页条数 |
| `totalPages` | number | 是 | 总页数 |

### PublicArticleDetailVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `uid` | string | 是 | 文章 UID |
| `title` | string | 是 | 标题 |
| `subTitle` | string | 否 | 子标题 |
| `summary` | string | 是 | 摘要 |
| `coverUrl` | string | 否 | 封面图 URL |
| `categoryId` | number | 否 | 分类 ID |
| `categoryName` | string | 是 | 分类名称 |
| `tags` | string[] | 否 | 标签 |
| `isTop` | boolean | 是 | 是否置顶 |
| `isFeatured` | boolean | 是 | 是否推荐 |
| `viewCount` | number | 是 | 阅读量 |
| `likeCount` | number | 是 | 点赞数 |
| `publishedAt` | string | 否 | 发布时间（ISO 8601） |
| `content` | string | 是 | 文章内容 |
| `contentFormat` | enum(markdown|html|text) | 是 | 内容格式 |
| `seoTitle` | string | 是 | SEO 标题 |
| `seoKeywords` | string | 是 | SEO 关键词 |
| `seoDescription` | string | 是 | SEO 描述 |

### PublicSurveyListItemVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `uid` | string | 是 | 问卷 UID |
| `title` | object | 是 | 问卷标题（多语言） |
| `description` | object | 否 | 问卷描述（多语言） |
| `themeColor` | string | 否 | 主题主色 |
| `loginRequired` | boolean | 是 | 是否需要登录 |
| `startTime` | string | 否 | 开始时间 |
| `endTime` | string | 否 | 截止时间 |
| `categoryId` | number | 否 | 分类 ID |
| `categoryName` | string | 是 | 分类名称 |

### PublicSurveyDetailVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `uid` | string | 是 | 问卷 UID |
| `title` | object | 是 | 问卷标题（多语言） |
| `description` | object | 否 | 问卷描述（多语言） |
| `themeColor` | string | 否 | 主题主色 |
| `loginRequired` | boolean | 是 | 是否需要登录 |
| `startTime` | string | 否 | 开始时间 |
| `endTime` | string | 否 | 截止时间 |
| `categoryId` | number | 否 | 分类 ID |
| `categoryName` | string | 是 | 分类名称 |
| `topics` | object | 否 | 问卷结构（题目列表配置 JSON schema） |
| `endMessage` | object | 否 | 结束语（多语言） |
| `showQuestionIndex` | boolean | 是 | 是否显示题目编号 |
| `languagesList` | string[] | 否 | 启用的多语言列表 |
| `requireGameBinding` | boolean | 是 | 是否要求绑定游戏账号 |
| `maxSubmitTimesPerUser` | number | 是 | 每用户最大提交次数 |

### PublicConfigItemVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `itemKey` | string | 是 | 配置项 key |
| `value` | string | 是 | 配置值 |
| `itemType` | enum(switch|number|text|json|select|multiselect) | 是 | 值类型 |
| `itemName` | string | 是 | 配置项名称 |
| `options` | object[] | 否 | 可选值列表（用于 select/multiselect 类型） |
| `description` | string | 是 | 配置说明 |

### PublicConfigValueVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `itemKey` | string | 是 | 配置项 key |
| `value` | string | 是 | 配置值 |
| `itemType` | enum(switch|number|text|json|select|multiselect) | 是 | 值类型 |

### AdminLoginDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `account` | string | 是 | 登录账号（邮箱或用户名） |
| `password` | string | 是 | 密码 |
| `deviceId` | string | 否 | 设备ID（指纹或本地生成） |
| `deviceName` | string | 否 | 设备名 |
| `platform` | enum(ios|android|web|desktop) | 否 | 平台 |

### AdminCreateUserDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `username` | string | 否 | 用户名 |
| `password` | string | 是 | 密码 |
| `email` | string | 否 | 邮箱地址 |
| `nickname` | string | 否 | 昵称 |
| `emailcode` | string | 否 | 注册用邮箱验证码（有 email 时必填） |
| `roleCodes` | string[] | 否 | 角色代码列表（可选，按 code 绑定） |

### IdDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 主键ID |

### IdsDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `ids` | string[] | 是 | 主键ID列表 |

### AssignRolesDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `userId` | number | 是 | 管理员ID |
| `roleCodes` | string[] | 是 | 角色代码数组（全量覆盖） |

### AdminUpdateUserDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `nickname` | string | 否 | 昵称 |
| `email` | string | 否 | 邮箱 |
| `status` | enum(active|inactive|banned) | 否 | 状态 |

### CreateRoleDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 是 | 角色名称 |
| `code` | string | 是 | 角色代码（唯一） |
| `is_system` | boolean | 否 | 是否系统内置 |
| `description` | string | 否 | 角色描述 |
| `permissionIds` | number[] | 否 | 初始权限ID列表 |

### AdminRole

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 角色ID |
| `name` | string | 是 | 角色名称 |
| `code` | string | 是 | 角色代码 |
| `is_system` | boolean | 是 | 是否系统内置 |
| `description` | string | 否 | 角色描述 |
| `created_at` | string(date-time) | 是 | 创建时间 |
| `updated_at` | string(date-time) | 是 | 更新时间 |

### UpdateRoleDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 角色ID |
| `name` | string | 否 | 角色名称 |
| `code` | string | 否 | 角色代码（唯一） |
| `is_system` | boolean | 否 | 是否系统内置 |
| `description` | string | 否 | 角色描述 |

### DeleteRoleDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 角色ID |

### AssignPermissionsDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `roleId` | number | 是 | 角色ID |
| `permissionIds` | string[] | 是 | 权限ID数组 |

### CreatePermissionDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 是 | 权限名称 |
| `code` | string | 是 | 权限编码（唯一） |
| `type` | enum(api|menu|action) | 是 | 类型 |
| `http_method` | enum(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) | 否 | HTTP 方法（type=api 必填） |
| `http_path` | string | 否 | HTTP 路径（type=api 必填） |
| `description` | string | 否 | 描述 |

### AdminPermission

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 是 | 权限名称 |
| `code` | string | 是 | 权限编码（唯一） |
| `type` | string | 是 | 类型 |
| `http_method` | string | 否 | HTTP 方法 |
| `http_path` | string | 否 | HTTP 路径 |
| `description` | string | 否 | 描述 |
| `created_at` | string(date-time) | 是 | 创建时间 |
| `updated_at` | string(date-time) | 是 | 更新时间 |

### UpdatePermissionDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 权限ID |
| `name` | string | 否 | 权限名称 |
| `code` | string | 否 | 权限编码（如允许变更） |
| `type` | enum(api|menu|action) | 否 | 类型 |
| `http_method` | enum(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) | 否 | HTTP 方法（当最终 type=api 时需具备合法性） |
| `http_path` | string | 否 | HTTP 路径（当最终 type=api 时需具备合法性） |
| `description` | string | 否 | 描述 |

### DeletePermissionDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 权限ID |

### CreateCredentialDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `appId` | string | 是 | 应用ID |
| `kid` | string | 是 | 密钥ID |
| `secret` | string | 是 | HMAC 密钥明文（后端会加密存储） |
| `alg` | enum(sha256|sha512) | 是 | - |
| `enc` | enum(hex|base64) | 是 | - |
| `notBefore` | string | 否 | 生效时间（ISO8601） |
| `expiresAt` | string | 否 | 过期时间（ISO8601） |
| `allowIps` | string[] | 否 | IP 白名单 |

### UpdateCredentialDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `status` | enum(active|inactive|revoked) | 否 | - |
| `notBefore` | string | 否 | 生效时间 |
| `expiresAt` | string | 否 | 过期时间 |
| `allowIps` | string[] | 否 | IP 白名单 |
| `description` | string | 否 | 备注 |

### RevokeCredentialDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `appId` | string | 是 | 应用ID |
| `kid` | string | 是 | kid |
| `reason` | string | 否 | 原因 |

### RotateCredentialDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `appId` | string | 是 | 应用ID |
| `newKid` | string | 是 | 新 kid（例如 k2） |
| `newSecret` | string | 是 | 新密钥明文 |
| `revokeOld` | boolean | 是 | 是否自动吊销旧密钥 |
| `oldKid` | string | 否 | 旧 kid（若需要显式指定） |

### OperationLogListItemVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 日志ID |
| `adminId` | number | 是 | 操作管理员ID（admin_users.id） |
| `adminUid` | string | 是 | 操作管理员UID（admin_users.uid） |
| `adminUsername` | string | 是 | 操作管理员用户名 |
| `module` | string | 是 | 操作模块 |
| `action` | enum(CREATE|UPDATE|DELETE|ENABLE|DISABLE|LOGIN|LOGOUT|EXPORT|IMPORT|OTHER) | 是 | 操作动作 |
| `description` | string | 是 | 操作描述 |
| `targetType` | enum(USER|ROLE|PERMISSION|CONFIG|CONTENT|OTHER) | 是 | 目标对象类型 |
| `targetId` | string | 否 | 目标对象ID |
| `httpMethod` | string | 是 | HTTP请求方法 |
| `requestPath` | string | 是 | 请求路径 |
| `ip` | string | 是 | 请求来源IP |
| `success` | boolean | 是 | 是否操作成功 |
| `errorCode` | string | 否 | 错误码 |
| `errorMessage` | string | 否 | 错误信息 |
| `durationMs` | number | 是 | 请求耗时（毫秒） |
| `createdAt` | string | 是 | 操作时间（ISO 8601 格式） |

### OperationLogListVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `total` | number | 是 | 总记录数 |
| `items` | [OperationLogListItemVO](#operationloglistitemvo)[] | 是 | 日志列表 |
| `page` | number | 是 | 当前页码 |
| `pageSize` | number | 是 | 每页条数 |
| `totalPages` | number | 是 | 总页数 |

### OperationLogDetailVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 日志ID |
| `adminId` | number | 是 | 操作管理员ID（admin_users.id） |
| `adminUid` | string | 是 | 操作管理员UID（admin_users.uid） |
| `adminUsername` | string | 是 | 操作管理员用户名 |
| `module` | string | 是 | 操作模块 |
| `action` | enum(CREATE|UPDATE|DELETE|ENABLE|DISABLE|LOGIN|LOGOUT|EXPORT|IMPORT|OTHER) | 是 | 操作动作 |
| `description` | string | 是 | 操作描述 |
| `targetType` | enum(USER|ROLE|PERMISSION|CONFIG|CONTENT|OTHER) | 是 | 目标对象类型 |
| `targetId` | string | 否 | 目标对象ID |
| `httpMethod` | string | 是 | HTTP请求方法 |
| `requestPath` | string | 是 | 请求路径 |
| `ip` | string | 是 | 请求来源IP |
| `success` | boolean | 是 | 是否操作成功 |
| `errorCode` | string | 否 | 错误码 |
| `errorMessage` | string | 否 | 错误信息 |
| `durationMs` | number | 是 | 请求耗时（毫秒） |
| `createdAt` | string | 是 | 操作时间（ISO 8601 格式） |
| `userAgent` | string | 否 | 用户代理/设备信息 |
| `requestBody` | object | 否 | 请求参数快照（已脱敏） |
| `responseBody` | object | 否 | 响应结果快照（可选） |
| `changes` | object | 否 | 字段变更明细 |
| `traceId` | string | 否 | 链路追踪ID |

### OperationLogStatsVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `todayCount` | number | 是 | 今日操作总数 |
| `todaySuccessCount` | number | 是 | 今日成功操作数 |
| `todayFailCount` | number | 是 | 今日失败操作数 |
| `weekCount` | number | 是 | 本周操作总数 |
| `monthCount` | number | 是 | 本月操作总数 |
| `moduleStats` | string[] | 是 | 各模块操作统计 |
| `actionStats` | string[] | 是 | 各动作操作统计 |

### OperationLogTimelineVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `time` | string | 是 | 时间点（ISO 8601 格式） |
| `count` | number | 是 | 操作数量 |
| `successCount` | number | 是 | 成功数量 |
| `failCount` | number | 是 | 失败数量 |

### CreateArticleDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `title` | string | 是 | 文章标题 |
| `subTitle` | string | 否 | 子标题 |
| `summary` | string | 否 | 摘要 |
| `content` | string | 是 | 文章正文内容 |
| `contentFormat` | enum(markdown|html|richtext) | 否 | 内容格式 |
| `coverUrl` | string | 否 | 封面图 URL |
| `categoryId` | number | 否 | 分类 ID |
| `categoryName` | string | 否 | 分类名称（冗余） |
| `tags` | string[] | 否 | 标签列表 |
| `status` | enum(draft|published|offline) | 否 | 文章状态 |
| `isTop` | boolean | 否 | 是否置顶 |
| `isFeatured` | boolean | 否 | 是否推荐 |
| `sortOrder` | number | 否 | 排序权重（越大越靠前） |
| `seoTitle` | string | 否 | SEO 标题 |
| `seoKeywords` | string | 否 | SEO 关键词 |
| `seoDescription` | string | 否 | SEO 描述 |

### ArticleDetailVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 文章 ID |
| `uid` | string | 是 | 文章 UID |
| `title` | string | 是 | 标题 |
| `subTitle` | string | 否 | 子标题 |
| `summary` | string | 是 | 摘要 |
| `coverUrl` | string | 否 | 封面图 URL |
| `categoryId` | number | 否 | 分类 ID |
| `categoryName` | string | 是 | 分类名称 |
| `tags` | string[] | 否 | 标签列表 |
| `status` | enum(draft|published|offline) | 是 | 状态 |
| `isTop` | boolean | 是 | 是否置顶 |
| `isFeatured` | boolean | 是 | 是否推荐 |
| `sortOrder` | number | 是 | 排序权重 |
| `viewCount` | number | 是 | 阅读量 |
| `likeCount` | number | 是 | 点赞数 |
| `createdBy` | number | 否 | 创建人 ID |
| `createdByUsername` | string | 是 | 创建人用户名 |
| `publishedAt` | string | 否 | 发布时间（ISO 8601） |
| `createdAt` | string | 是 | 创建时间（ISO 8601） |
| `updatedAt` | string | 是 | 更新时间（ISO 8601） |
| `content` | string | 是 | 文章正文内容 |
| `contentFormat` | enum(markdown|html|richtext) | 是 | 内容格式 |
| `seoTitle` | string | 是 | SEO 标题 |
| `seoKeywords` | string | 是 | SEO 关键词 |
| `seoDescription` | string | 是 | SEO 描述 |
| `createdByUid` | string | 是 | 创建人 UID |
| `updatedBy` | number | 否 | 最后修改人 ID |
| `updatedByUid` | string | 是 | 最后修改人 UID |
| `updatedByUsername` | string | 是 | 最后修改人用户名 |
| `isDeleted` | boolean | 是 | 是否已删除 |

### ArticleListItemVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 文章 ID |
| `uid` | string | 是 | 文章 UID |
| `title` | string | 是 | 标题 |
| `subTitle` | string | 否 | 子标题 |
| `summary` | string | 是 | 摘要 |
| `coverUrl` | string | 否 | 封面图 URL |
| `categoryId` | number | 否 | 分类 ID |
| `categoryName` | string | 是 | 分类名称 |
| `tags` | string[] | 否 | 标签列表 |
| `status` | enum(draft|published|offline) | 是 | 状态 |
| `isTop` | boolean | 是 | 是否置顶 |
| `isFeatured` | boolean | 是 | 是否推荐 |
| `sortOrder` | number | 是 | 排序权重 |
| `viewCount` | number | 是 | 阅读量 |
| `likeCount` | number | 是 | 点赞数 |
| `createdBy` | number | 否 | 创建人 ID |
| `createdByUsername` | string | 是 | 创建人用户名 |
| `publishedAt` | string | 否 | 发布时间（ISO 8601） |
| `createdAt` | string | 是 | 创建时间（ISO 8601） |
| `updatedAt` | string | 是 | 更新时间（ISO 8601） |

### ArticleListVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `total` | number | 是 | 总记录数 |
| `items` | [ArticleListItemVO](#articlelistitemvo)[] | 是 | 文章列表 |
| `page` | number | 是 | 当前页码 |
| `pageSize` | number | 是 | 每页条数 |
| `totalPages` | number | 是 | 总页数 |

### ArticleStatsVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `totalCount` | number | 是 | 文章总数 |
| `draftCount` | number | 是 | 草稿数 |
| `publishedCount` | number | 是 | 已发布数 |
| `offlineCount` | number | 是 | 已下线数 |
| `topCount` | number | 是 | 置顶文章数 |
| `featuredCount` | number | 是 | 推荐文章数 |
| `totalViewCount` | number | 是 | 总阅读量 |
| `totalLikeCount` | number | 是 | 总点赞数 |
| `categoryStats` | string[] | 是 | 各分类文章统计 |

### ConfigOptionDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `label` | string | 是 | 选项标签 |
| `value` | string | 是 | 选项值 |

### CreateModuleConfigDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `moduleCode` | string | 是 | 模块编码 |
| `moduleName` | string | 否 | 模块名称 |
| `itemKey` | string | 是 | 配置项 key |
| `itemName` | string | 否 | 配置项名称 |
| `itemType` | enum(switch|number|text|json|select|multiselect) | 否 | 配置项类型 |
| `value` | string | 是 | 配置值 |
| `defaultValue` | string | 否 | 默认值 |
| `options` | [ConfigOptionDto](#configoptiondto)[] | 否 | 可选值列表（用于 select/multiselect 类型） |
| `status` | enum(enabled|disabled) | 否 | 状态 |
| `description` | string | 否 | 配置项说明 |
| `remark` | string | 否 | 配置项备注（内部使用） |
| `sortOrder` | number | 否 | 排序权重（越大越靠前） |
| `isSystem` | boolean | 否 | 是否系统内置 |

### CreateSurveyDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `title` | object | 是 | 问卷标题（多语言 JSON） |
| `description` | object | 否 | 问卷描述（多语言 JSON） |
| `topics` | object | 否 | 问卷结构（题目列表配置 JSON schema） |
| `endMessage` | object | 否 | 答卷结束提示语（多语言 JSON） |
| `languagesList` | string[] | 否 | 启用的多语言列表 |
| `themeColor` | string | 否 | 主题主色 |
| `status` | enum(draft|active|closed) | 否 | 状态 |
| `loginRequired` | boolean | 否 | 是否需要登录才可答题 |
| `answerLimitDate` | boolean | 否 | 是否限制答题时间 |
| `showQuestionIndex` | boolean | 否 | 是否显示题目编号 |
| `startTime` | string | 否 | 问卷开始时间 |
| `endTime` | string | 否 | 问卷截止时间 |
| `datetimeRange` | string[] | 否 | 时间范围 [start, end] |
| `maxSubmitTimesPerUser` | number | 否 | 每个用户最多可提交次数（0 表示不限制） |
| `requireGameBinding` | boolean | 否 | 是否要求填写前绑定游戏账号 |
| `sortOrder` | number | 否 | 排序权重（数字越大越靠前） |
| `categoryId` | number | 否 | 分类 ID（关联 admin_categories） |
| `categoryName` | string | 否 | 分类名称（冗余，便于展示） |

### CreateCategoryDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `moduleCode` | string | 是 | 模块编码 |
| `name` | string | 是 | 分类名称 |
| `slug` | string | 是 | URL 标识（同一模块内唯一） |
| `description` | string | 否 | 分类描述 |
| `icon` | string | 否 | 图标 |
| `coverUrl` | string | 否 | 封面图 URL |
| `parentId` | number | 否 | 父分类 ID |
| `sortOrder` | number | 否 | 排序权重（越大越靠前） |
| `status` | enum(enabled|disabled) | 否 | 状态 |

### UpdateCategoryDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 否 | 分类名称 |
| `slug` | string | 否 | URL 标识 |
| `description` | string | 否 | 分类描述 |
| `icon` | string | 否 | 图标 |
| `coverUrl` | string | 否 | 封面图 URL |
| `parentId` | number | 否 | 父分类 ID |
| `sortOrder` | number | 否 | 排序权重 |
| `status` | enum(enabled|disabled) | 否 | 状态 |

### CreateSurveyResponseDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `surveyUid` | string | 是 | 问卷 UID |
| `answers` | object | 是 | 问卷答案（JSON 对象，key 为题目 ID，value 为答案） |
| `durationSeconds` | number | 否 | 填写时长（秒） |
| `locale` | string | 否 | 提交者所选语言（如 zhCN, enUS） |
| `surveyLanguage` | string | 否 | 提交时使用的问卷语言 |
| `referrer` | string | 否 | 来源 Referrer |
| `nickname` | string | 否 | 用户昵称（自填） |
| `guid` | string | 否 | 用户 KID/GUID（游戏账号标识） |
| `gamelink` | object | 否 | 用户游戏链接信息 |
| `email` | string | 否 | 用户邮箱（自填） |
| `timeZone` | string | 否 | 提交者时区 |

### SubmitResultVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `success` | boolean | 是 | 是否成功 |
| `responseUid` | string | 是 | 响应 UID |
| `message` | string | 否 | 消息 |

### SurveyResponseListItemVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 响应 ID |
| `uid` | string | 是 | 响应 UID |
| `surveyUid` | string | 是 | 问卷 UID |
| `status` | enum(submitted|reviewing|approved|rejected) | 是 | 响应状态 |
| `isEffective` | boolean | 是 | 是否有效 |
| `durationSeconds` | number | 否 | 填写时长（秒） |
| `locale` | string | 否 | 提交语言 |
| `createdAt` | string | 是 | 提交时间（ISO 8601） |

### SurveyResponseListVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `total` | number | 是 | 总记录数 |
| `items` | [SurveyResponseListItemVO](#surveyresponselistitemvo)[] | 是 | 响应列表 |
| `page` | number | 是 | 当前页码 |
| `pageSize` | number | 是 | 每页条数 |
| `totalPages` | number | 是 | 总页数 |

### SurveyResponseDetailVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | number | 是 | 响应 ID |
| `uid` | string | 是 | 响应 UID |
| `surveyUid` | string | 是 | 问卷 UID |
| `status` | enum(submitted|reviewing|approved|rejected) | 是 | 响应状态 |
| `isEffective` | boolean | 是 | 是否有效 |
| `durationSeconds` | number | 否 | 填写时长（秒） |
| `locale` | string | 否 | 提交语言 |
| `createdAt` | string | 是 | 提交时间（ISO 8601） |
| `answers` | object | 是 | 问卷答案 |
| `surveyLanguage` | string | 否 | 问卷语言 |
| `updatedAt` | string | 是 | 更新时间（ISO 8601） |

### UserSurveyStatusVO

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `surveyUid` | string | 是 | 问卷 UID |
| `hasSubmitted` | boolean | 是 | 是否已提交 |
| `submitCount` | number | 否 | 已提交次数 |
| `maxSubmitTimes` | number | 否 | 最大可提交次数（0 表示不限） |
| `canSubmit` | boolean | 是 | 是否可以继续提交 |
| `lastResponseUid` | string | 否 | 最后一次提交的响应 UID |
| `lastSubmitTime` | string | 否 | 最后提交时间 |

### UpdateSurveyResponseDto

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `answers` | object | 否 | 问卷答案（JSON 对象） |
| `nickname` | string | 否 | 用户昵称 |
| `guid` | string | 否 | 用户 KID/GUID |
| `gamelink` | object | 否 | 游戏链接信息 |
| `email` | string | 否 | 用户邮箱 |

---

*本文档由 JMNI Server 自动生成，生成时间: 2025/12/5 11:11:45*