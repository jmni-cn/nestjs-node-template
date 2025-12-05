// src/common/exceptions/error-codes.enum.ts
/**
 * 统一错误码枚举
 * 格式: [模块][功能][序号]
 * 例如: AUTH_LOGIN_001 = 认证模块-登录功能-第1个错误
 */
export enum ErrorCodes {
  // ==================== 通用错误 (1000-1999) ====================
  SUCCESS = 0,
  UNKNOWN_ERROR = 1000,
  VALIDATION_ERROR = 1001,
  PARAMETER_ERROR = 1002,
  PERMISSION_DENIED = 1003,
  RESOURCE_NOT_FOUND = 1004,
  RESOURCE_ALREADY_EXISTS = 1005,
  OPERATION_FAILED = 1006,
  NETWORK_ERROR = 1007,
  TIMEOUT_ERROR = 1008,
  RATE_LIMIT_EXCEEDED = 1009,
  MAINTENANCE_MODE = 1010,

  // ==================== 认证模块 (2000-2999) ====================
  AUTH_TOKEN_INVALID = 2001,
  AUTH_TOKEN_EXPIRED = 2002,
  AUTH_TOKEN_MISSING = 2003,
  AUTH_LOGIN_FAILED = 2004,
  AUTH_PASSWORD_INCORRECT = 2005,
  AUTH_USER_NOT_FOUND = 2006,
  AUTH_USER_DISABLED = 2007,
  AUTH_USER_LOCKED = 2008,
  AUTH_SESSION_EXPIRED = 2009,
  AUTH_SESSION_INVALID = 2010,
  AUTH_REFRESH_TOKEN_INVALID = 2011,
  AUTH_REFRESH_TOKEN_EXPIRED = 2012,
  AUTH_DEVICE_LIMIT_EXCEEDED = 2013,
  AUTH_EMAIL_NOT_VERIFIED = 2014,
  AUTH_PHONE_NOT_VERIFIED = 2015,
  AUTH_EMAIL_CODE_INVALID = 2016,
  AUTH_EMAIL_CODE_EXPIRED = 2017,
  AUTH_EMAIL_CODE_SEND_FAILED = 2018,
  AUTH_EMAIL_CODE_COOLDOWN = 2019,
  AUTH_EMAIL_CODE_MAX_TRIES = 2020,
  AUTH_OAUTH_PROVIDER_ERROR = 2021,
  AUTH_OAUTH_USER_INFO_ERROR = 2022,

  // ==================== 用户模块 (3000-3999) ====================
  USER_NOT_FOUND = 3001,
  USER_ALREADY_EXISTS = 3002,
  USER_EMAIL_EXISTS = 3003,
  USER_USERNAME_EXISTS = 3004,
  USER_PHONE_EXISTS = 3005,
  USER_PROFILE_UPDATE_FAILED = 3006,
  USER_PASSWORD_CHANGE_FAILED = 3007,
  USER_AVATAR_UPLOAD_FAILED = 3008,
  USER_STATUS_INVALID = 3009,
  USER_DELETE_FAILED = 3010,

  // ==================== 安全模块 (5000-5999) ====================
  SECURITY_SIGNATURE_INVALID = 5001,
  SECURITY_SIGNATURE_MISSING = 5002,
  SECURITY_SIGNATURE_EXPIRED = 5003,
  SECURITY_REPLAY_ATTACK = 5004,
  SECURITY_IP_BLOCKED = 5005,
  SECURITY_RATE_LIMIT = 5006,
  SECURITY_ENCRYPTION_ERROR = 5007,
  SECURITY_DECRYPTION_ERROR = 5008,
  SECURITY_KEY_NOT_FOUND = 5009,
  SECURITY_KEY_EXPIRED = 5010,
  SECURITY_RATE_LIMIT_EXCEEDED = 5011,
  // ==================== 数据库模块 (6000-6999) ====================
  DATABASE_CONNECTION_ERROR = 6001,
  DATABASE_QUERY_ERROR = 6002,
  DATABASE_TRANSACTION_ERROR = 6003,
  DATABASE_CONSTRAINT_ERROR = 6004,
  DATABASE_TIMEOUT_ERROR = 6005,
  DATABASE_DEADLOCK_ERROR = 6006,

  // ==================== 缓存模块 (7000-7999) ====================
  CACHE_CONNECTION_ERROR = 7001,
  CACHE_GET_ERROR = 7002,
  CACHE_SET_ERROR = 7003,
  CACHE_DELETE_ERROR = 7004,
  CACHE_EXPIRE_ERROR = 7005,

  // ==================== 文件模块 (8000-8999) ====================
  FILE_UPLOAD_ERROR = 8001,
  FILE_DOWNLOAD_ERROR = 8002,
  FILE_NOT_FOUND = 8003,
  FILE_SIZE_EXCEEDED = 8004,
  FILE_TYPE_INVALID = 8005,
  FILE_PERMISSION_DENIED = 8006,

  // ==================== 邮件模块 (9000-9999) ====================
  EMAIL_SEND_ERROR = 9001,
  EMAIL_TEMPLATE_ERROR = 9002,
  EMAIL_CONFIG_ERROR = 9003,
  EMAIL_RATE_LIMIT = 9004,
  EMAIL_BLOCKED = 9005,

  // ==================== 管理后台模块 (10000-10999) ====================
  ADMIN_PERMISSION_DENIED = 10001,
  ADMIN_ROLE_NOT_FOUND = 10002,
  ADMIN_ROLE_ALREADY_EXISTS = 10003,
  ADMIN_PERMISSION_NOT_FOUND = 10004,
  ADMIN_PERMISSION_ALREADY_EXISTS = 10005,
  ADMIN_USER_NOT_FOUND = 10006,
  ADMIN_USER_ALREADY_EXISTS = 10007,
  ADMIN_CREDENTIAL_INVALID = 10008,
  ADMIN_CREDENTIAL_EXPIRED = 10009,
}

/**
 * 错误码对应的默认消息
 */
export const ErrorMessages: Record<ErrorCodes, string> = {
  [ErrorCodes.SUCCESS]: '操作成功',
  [ErrorCodes.UNKNOWN_ERROR]: '未知错误',
  [ErrorCodes.VALIDATION_ERROR]: '参数验证失败',
  [ErrorCodes.PARAMETER_ERROR]: '参数错误',
  [ErrorCodes.PERMISSION_DENIED]: '权限不足',
  [ErrorCodes.RESOURCE_NOT_FOUND]: '资源不存在',
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: '资源已存在',
  [ErrorCodes.OPERATION_FAILED]: '操作失败',
  [ErrorCodes.NETWORK_ERROR]: '网络错误',
  [ErrorCodes.TIMEOUT_ERROR]: '请求超时',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: '请求频率过高',
  [ErrorCodes.MAINTENANCE_MODE]: '系统维护中',

  // 认证模块
  [ErrorCodes.AUTH_TOKEN_INVALID]: 'Token无效',
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 'Token已过期',
  [ErrorCodes.AUTH_TOKEN_MISSING]: '缺少Token',
  [ErrorCodes.AUTH_LOGIN_FAILED]: '登录失败',
  [ErrorCodes.AUTH_PASSWORD_INCORRECT]: '密码错误',
  [ErrorCodes.AUTH_USER_NOT_FOUND]: '用户不存在',
  [ErrorCodes.AUTH_USER_DISABLED]: '用户已被禁用',
  [ErrorCodes.AUTH_USER_LOCKED]: '用户已被锁定',
  [ErrorCodes.AUTH_SESSION_EXPIRED]: '会话已过期',
  [ErrorCodes.AUTH_SESSION_INVALID]: '会话无效',
  [ErrorCodes.AUTH_REFRESH_TOKEN_INVALID]: '刷新Token无效',
  [ErrorCodes.AUTH_REFRESH_TOKEN_EXPIRED]: '刷新Token已过期',
  [ErrorCodes.AUTH_DEVICE_LIMIT_EXCEEDED]: '设备数量超限',
  [ErrorCodes.AUTH_EMAIL_NOT_VERIFIED]: '邮箱未验证',
  [ErrorCodes.AUTH_PHONE_NOT_VERIFIED]: '手机号未验证',
  [ErrorCodes.AUTH_EMAIL_CODE_INVALID]: '邮箱验证码无效',
  [ErrorCodes.AUTH_EMAIL_CODE_EXPIRED]: '邮箱验证码已过期',
  [ErrorCodes.AUTH_EMAIL_CODE_SEND_FAILED]: '邮箱验证码发送失败',
  [ErrorCodes.AUTH_EMAIL_CODE_COOLDOWN]: '验证码发送过于频繁',
  [ErrorCodes.AUTH_EMAIL_CODE_MAX_TRIES]: '验证码尝试次数超限',
  [ErrorCodes.AUTH_OAUTH_PROVIDER_ERROR]: '第三方登录服务错误',
  [ErrorCodes.AUTH_OAUTH_USER_INFO_ERROR]: '获取第三方用户信息失败',

  // 用户模块
  [ErrorCodes.USER_NOT_FOUND]: '用户不存在',
  [ErrorCodes.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCodes.USER_EMAIL_EXISTS]: '邮箱已被使用',
  [ErrorCodes.USER_USERNAME_EXISTS]: '用户名已被使用',
  [ErrorCodes.USER_PHONE_EXISTS]: '手机号已被使用',
  [ErrorCodes.USER_PROFILE_UPDATE_FAILED]: '用户资料更新失败',
  [ErrorCodes.USER_PASSWORD_CHANGE_FAILED]: '密码修改失败',
  [ErrorCodes.USER_AVATAR_UPLOAD_FAILED]: '头像上传失败',
  [ErrorCodes.USER_STATUS_INVALID]: '用户状态无效',
  [ErrorCodes.USER_DELETE_FAILED]: '用户删除失败',

  // 安全模块
  [ErrorCodes.SECURITY_SIGNATURE_INVALID]: '签名无效',
  [ErrorCodes.SECURITY_SIGNATURE_MISSING]: '缺少签名',
  [ErrorCodes.SECURITY_SIGNATURE_EXPIRED]: '签名已过期',
  [ErrorCodes.SECURITY_REPLAY_ATTACK]: '重放攻击检测',
  [ErrorCodes.SECURITY_IP_BLOCKED]: 'IP已被封禁',
  [ErrorCodes.SECURITY_RATE_LIMIT]: '请求频率过高',
  [ErrorCodes.SECURITY_ENCRYPTION_ERROR]: '加密错误',
  [ErrorCodes.SECURITY_DECRYPTION_ERROR]: '解密错误',
  [ErrorCodes.SECURITY_KEY_NOT_FOUND]: '密钥不存在',
  [ErrorCodes.SECURITY_KEY_EXPIRED]: '密钥已过期',
  [ErrorCodes.SECURITY_RATE_LIMIT_EXCEEDED]: '签名验证请求过于频繁',
  // 数据库模块
  [ErrorCodes.DATABASE_CONNECTION_ERROR]: '数据库连接错误',
  [ErrorCodes.DATABASE_QUERY_ERROR]: '数据库查询错误',
  [ErrorCodes.DATABASE_TRANSACTION_ERROR]: '数据库事务错误',
  [ErrorCodes.DATABASE_CONSTRAINT_ERROR]: '数据库约束错误',
  [ErrorCodes.DATABASE_TIMEOUT_ERROR]: '数据库超时',
  [ErrorCodes.DATABASE_DEADLOCK_ERROR]: '数据库死锁',

  // 缓存模块
  [ErrorCodes.CACHE_CONNECTION_ERROR]: '缓存连接错误',
  [ErrorCodes.CACHE_GET_ERROR]: '缓存获取错误',
  [ErrorCodes.CACHE_SET_ERROR]: '缓存设置错误',
  [ErrorCodes.CACHE_DELETE_ERROR]: '缓存删除错误',
  [ErrorCodes.CACHE_EXPIRE_ERROR]: '缓存过期错误',

  // 文件模块
  [ErrorCodes.FILE_UPLOAD_ERROR]: '文件上传错误',
  [ErrorCodes.FILE_DOWNLOAD_ERROR]: '文件下载错误',
  [ErrorCodes.FILE_NOT_FOUND]: '文件不存在',
  [ErrorCodes.FILE_SIZE_EXCEEDED]: '文件大小超限',
  [ErrorCodes.FILE_TYPE_INVALID]: '文件类型无效',
  [ErrorCodes.FILE_PERMISSION_DENIED]: '文件权限不足',

  // 邮件模块
  [ErrorCodes.EMAIL_SEND_ERROR]: '邮件发送错误',
  [ErrorCodes.EMAIL_TEMPLATE_ERROR]: '邮件模板错误',
  [ErrorCodes.EMAIL_CONFIG_ERROR]: '邮件配置错误',
  [ErrorCodes.EMAIL_RATE_LIMIT]: '邮件发送频率过高',
  [ErrorCodes.EMAIL_BLOCKED]: '邮件发送被阻止',

  // 管理后台模块
  [ErrorCodes.ADMIN_PERMISSION_DENIED]: '管理员权限不足',
  [ErrorCodes.ADMIN_ROLE_NOT_FOUND]: '角色不存在',
  [ErrorCodes.ADMIN_ROLE_ALREADY_EXISTS]: '角色已存在',
  [ErrorCodes.ADMIN_PERMISSION_NOT_FOUND]: '权限不存在',
  [ErrorCodes.ADMIN_PERMISSION_ALREADY_EXISTS]: '权限已存在',
  [ErrorCodes.ADMIN_USER_NOT_FOUND]: '管理员用户不存在',
  [ErrorCodes.ADMIN_USER_ALREADY_EXISTS]: '管理员用户已存在',
  [ErrorCodes.ADMIN_CREDENTIAL_INVALID]: '管理员凭证无效',
  [ErrorCodes.ADMIN_CREDENTIAL_EXPIRED]: '管理员凭证已过期',
};
