// src/common/exceptions/exception.util.ts
import { ErrorCodes } from './error-codes.enum';
import {
  BusinessException,
  AuthException,
  PermissionException,
  NotFoundException,
  ConflictException,
  ValidationException,
  InternalException,
  DatabaseException,
  CacheException,
  NetworkException,
  RateLimitException,
} from './business.exception';

/**
 * 异常工具类
 * 提供便捷的异常创建方法
 */
export class ExceptionUtil {
  /**
   * 认证相关异常
   */
  static auth = {
    tokenInvalid: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_TOKEN_INVALID,
        undefined,
        details,
        traceId,
      ),

    tokenExpired: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_TOKEN_EXPIRED,
        undefined,
        details,
        traceId,
      ),

    tokenMissing: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_TOKEN_MISSING,
        undefined,
        details,
        traceId,
      ),

    loginFailed: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_LOGIN_FAILED,
        undefined,
        details,
        traceId,
      ),

    passwordIncorrect: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_PASSWORD_INCORRECT,
        undefined,
        details,
        traceId,
      ),

    userNotFound: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_USER_NOT_FOUND,
        undefined,
        details,
        traceId,
      ),

    userDisabled: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_USER_DISABLED,
        undefined,
        details,
        traceId,
      ),

    userLocked: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_USER_LOCKED,
        undefined,
        details,
        traceId,
      ),

    sessionExpired: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_SESSION_EXPIRED,
        undefined,
        details,
        traceId,
      ),

    sessionInvalid: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_SESSION_INVALID,
        undefined,
        details,
        traceId,
      ),

    refreshTokenInvalid: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_REFRESH_TOKEN_INVALID,
        undefined,
        details,
        traceId,
      ),

    refreshTokenExpired: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_REFRESH_TOKEN_EXPIRED,
        undefined,
        details,
        traceId,
      ),

    deviceLimitExceeded: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_DEVICE_LIMIT_EXCEEDED,
        undefined,
        details,
        traceId,
      ),

    emailNotVerified: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_EMAIL_NOT_VERIFIED,
        undefined,
        details,
        traceId,
      ),

    phoneNotVerified: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_PHONE_NOT_VERIFIED,
        undefined,
        details,
        traceId,
      ),

    emailCodeInvalid: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_EMAIL_CODE_INVALID,
        undefined,
        details,
        traceId,
      ),

    emailCodeExpired: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_EMAIL_CODE_EXPIRED,
        undefined,
        details,
        traceId,
      ),

    emailCodeSendFailed: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_EMAIL_CODE_SEND_FAILED,
        undefined,
        details,
        traceId,
      ),

    emailCodeCooldown: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_EMAIL_CODE_COOLDOWN,
        undefined,
        details,
        traceId,
      ),

    emailCodeMaxTries: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_EMAIL_CODE_MAX_TRIES,
        undefined,
        details,
        traceId,
      ),

    oauthProviderError: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_OAUTH_PROVIDER_ERROR,
        undefined,
        details,
        traceId,
      ),

    oauthUserInfoError: (details?: unknown, traceId?: string) =>
      new AuthException(
        ErrorCodes.AUTH_OAUTH_USER_INFO_ERROR,
        undefined,
        details,
        traceId,
      ),
  };

  /**
   * 权限相关异常
   */
  static permission = {
    denied: (details?: unknown, traceId?: string) =>
      new PermissionException(
        ErrorCodes.PERMISSION_DENIED,
        undefined,
        details,
        traceId,
      ),

    adminDenied: (details?: unknown, traceId?: string) =>
      new PermissionException(
        ErrorCodes.ADMIN_PERMISSION_DENIED,
        undefined,
        details,
        traceId,
      ),
  };

  /**
   * 资源不存在异常
   */
  static notFound = {
    resource: (details?: unknown, traceId?: string) =>
      new NotFoundException(
        ErrorCodes.RESOURCE_NOT_FOUND,
        undefined,
        details,
        traceId,
      ),

    user: (details?: unknown, traceId?: string) =>
      new NotFoundException(
        ErrorCodes.USER_NOT_FOUND,
        undefined,
        details,
        traceId,
      ),

    file: (details?: unknown, traceId?: string) =>
      new NotFoundException(
        ErrorCodes.FILE_NOT_FOUND,
        undefined,
        details,
        traceId,
      ),

    adminUser: (details?: unknown, traceId?: string) =>
      new NotFoundException(
        ErrorCodes.ADMIN_USER_NOT_FOUND,
        undefined,
        details,
        traceId,
      ),

    role: (details?: unknown, traceId?: string) =>
      new NotFoundException(
        ErrorCodes.ADMIN_ROLE_NOT_FOUND,
        undefined,
        details,
        traceId,
      ),

    permission: (details?: unknown, traceId?: string) =>
      new NotFoundException(
        ErrorCodes.ADMIN_PERMISSION_NOT_FOUND,
        undefined,
        details,
        traceId,
      ),
  };

  /**
   * 资源冲突异常
   */
  static conflict = {
    resource: (details?: unknown, traceId?: string) =>
      new ConflictException(
        ErrorCodes.RESOURCE_ALREADY_EXISTS,
        undefined,
        details,
        traceId,
      ),

    user: (details?: unknown, traceId?: string) =>
      new ConflictException(
        ErrorCodes.USER_ALREADY_EXISTS,
        undefined,
        details,
        traceId,
      ),

    email: (details?: unknown, traceId?: string) =>
      new ConflictException(
        ErrorCodes.USER_EMAIL_EXISTS,
        undefined,
        details,
        traceId,
      ),

    username: (details?: unknown, traceId?: string) =>
      new ConflictException(
        ErrorCodes.USER_USERNAME_EXISTS,
        undefined,
        details,
        traceId,
      ),

    phone: (details?: unknown, traceId?: string) =>
      new ConflictException(
        ErrorCodes.USER_PHONE_EXISTS,
        undefined,
        details,
        traceId,
      ),
    adminUser: (details?: unknown, traceId?: string) =>
      new ConflictException(
        ErrorCodes.ADMIN_USER_ALREADY_EXISTS,
        undefined,
        details,
        traceId,
      ),

    role: (details?: unknown, traceId?: string) =>
      new ConflictException(
        ErrorCodes.ADMIN_ROLE_ALREADY_EXISTS,
        undefined,
        details,
        traceId,
      ),

    permission: (details?: unknown, traceId?: string) =>
      new ConflictException(
        ErrorCodes.ADMIN_PERMISSION_ALREADY_EXISTS,
        undefined,
        details,
        traceId,
      ),

  };

  /**
   * 参数验证异常
   */
  static validation = {
    error: (details?: unknown, traceId?: string) =>
      new ValidationException(
        ErrorCodes.VALIDATION_ERROR,
        undefined,
        details,
        traceId,
      ),

    parameter: (details?: unknown, traceId?: string) =>
      new ValidationException(
        ErrorCodes.PARAMETER_ERROR,
        undefined,
        details,
        traceId,
      ),

    fileSize: (details?: unknown, traceId?: string) =>
      new ValidationException(
        ErrorCodes.FILE_SIZE_EXCEEDED,
        undefined,
        details,
        traceId,
      ),

    fileType: (details?: unknown, traceId?: string) =>
      new ValidationException(
        ErrorCodes.FILE_TYPE_INVALID,
        undefined,
        details,
        traceId,
      ),
  };

  /**
   * 安全相关异常
   */
  static security = {
    rateLimitExceeded: (details?: unknown, traceId?: string) =>
      new RateLimitException(
        ErrorCodes.SECURITY_RATE_LIMIT_EXCEEDED,
        undefined,
        details,
        traceId,
      ),

    signatureInvalid: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.SECURITY_SIGNATURE_INVALID,
        undefined,
        undefined,
        details,
        traceId,
      ),

    signatureMissing: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.SECURITY_SIGNATURE_MISSING,
        undefined,
        undefined,
        details,
        traceId,
      ),

    signatureExpired: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.SECURITY_SIGNATURE_EXPIRED,
        undefined,
        undefined,
        details,
        traceId,
      ),

    replayAttack: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.SECURITY_REPLAY_ATTACK,
        undefined,
        undefined,
        details,
        traceId,
      ),

    ipBlocked: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.SECURITY_IP_BLOCKED,
        undefined,
        undefined,
        details,
        traceId,
      ),

    rateLimit: (details?: unknown, traceId?: string) =>
      new RateLimitException(
        ErrorCodes.SECURITY_RATE_LIMIT,
        undefined,
        details,
        traceId,
      ),

    encryptionError: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.SECURITY_ENCRYPTION_ERROR,
        undefined,
        undefined,
        details,
        traceId,
      ),

    decryptionError: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.SECURITY_DECRYPTION_ERROR,
        undefined,
        undefined,
        details,
        traceId,
      ),

    keyNotFound: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.SECURITY_KEY_NOT_FOUND,
        undefined,
        undefined,
        details,
        traceId,
      ),

    keyExpired: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.SECURITY_KEY_EXPIRED,
        undefined,
        undefined,
        details,
        traceId,
      ),
  };

  /**
   * 数据库相关异常
   */
  static database = {
    connectionError: (details?: unknown, traceId?: string) =>
      new DatabaseException(
        ErrorCodes.DATABASE_CONNECTION_ERROR,
        undefined,
        details,
        traceId,
      ),

    queryError: (details?: unknown, traceId?: string) =>
      new DatabaseException(
        ErrorCodes.DATABASE_QUERY_ERROR,
        undefined,
        details,
        traceId,
      ),

    transactionError: (details?: unknown, traceId?: string) =>
      new DatabaseException(
        ErrorCodes.DATABASE_TRANSACTION_ERROR,
        undefined,
        details,
        traceId,
      ),

    constraintError: (details?: unknown, traceId?: string) =>
      new DatabaseException(
        ErrorCodes.DATABASE_CONSTRAINT_ERROR,
        undefined,
        details,
        traceId,
      ),

    timeoutError: (details?: unknown, traceId?: string) =>
      new DatabaseException(
        ErrorCodes.DATABASE_TIMEOUT_ERROR,
        undefined,
        details,
        traceId,
      ),

    deadlockError: (details?: unknown, traceId?: string) =>
      new DatabaseException(
        ErrorCodes.DATABASE_DEADLOCK_ERROR,
        undefined,
        details,
        traceId,
      ),
  };

  /**
   * 缓存相关异常
   */
  static cache = {
    connectionError: (details?: unknown, traceId?: string) =>
      new CacheException(
        ErrorCodes.CACHE_CONNECTION_ERROR,
        undefined,
        details,
        traceId,
      ),

    getError: (details?: unknown, traceId?: string) =>
      new CacheException(
        ErrorCodes.CACHE_GET_ERROR,
        undefined,
        details,
        traceId,
      ),

    setError: (details?: unknown, traceId?: string) =>
      new CacheException(
        ErrorCodes.CACHE_SET_ERROR,
        undefined,
        details,
        traceId,
      ),

    deleteError: (details?: unknown, traceId?: string) =>
      new CacheException(
        ErrorCodes.CACHE_DELETE_ERROR,
        undefined,
        details,
        traceId,
      ),

    expireError: (details?: unknown, traceId?: string) =>
      new CacheException(
        ErrorCodes.CACHE_EXPIRE_ERROR,
        undefined,
        details,
        traceId,
      ),
  };

  /**
   * 网络相关异常
   */
  static network = {
    error: (details?: unknown, traceId?: string) =>
      new NetworkException(
        ErrorCodes.NETWORK_ERROR,
        undefined,
        details,
        traceId,
      ),

    timeout: (details?: unknown, traceId?: string) =>
      new NetworkException(
        ErrorCodes.TIMEOUT_ERROR,
        undefined,
        details,
        traceId,
      ),
  };

  /**
   * 邮件相关异常
   */
  static email = {
    sendError: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.EMAIL_SEND_ERROR,
        undefined,
        undefined,
        details,
        traceId,
      ),

    templateError: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.EMAIL_TEMPLATE_ERROR,
        undefined,
        undefined,
        details,
        traceId,
      ),

    configError: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.EMAIL_CONFIG_ERROR,
        undefined,
        undefined,
        details,
        traceId,
      ),

    rateLimit: (details?: unknown, traceId?: string) =>
      new RateLimitException(
        ErrorCodes.EMAIL_RATE_LIMIT,
        undefined,
        details,
        traceId,
      ),

    blocked: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.EMAIL_BLOCKED,
        undefined,
        undefined,
        details,
        traceId,
      ),
  };

  /**
   * 文件相关异常
   */
  static file = {
    uploadError: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.FILE_UPLOAD_ERROR,
        undefined,
        undefined,
        details,
        traceId,
      ),

    downloadError: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.FILE_DOWNLOAD_ERROR,
        undefined,
        undefined,
        details,
        traceId,
      ),

    permissionDenied: (details?: unknown, traceId?: string) =>
      new BusinessException(
        ErrorCodes.FILE_PERMISSION_DENIED,
        undefined,
        undefined,
        details,
        traceId,
      ),
  };

  /**
   * 内部错误异常
   */
  static internal = {
    error: (details?: unknown, traceId?: string) =>
      new InternalException(
        ErrorCodes.UNKNOWN_ERROR,
        undefined,
        details,
        traceId,
      ),

    operationFailed: (details?: unknown, traceId?: string) =>
      new InternalException(
        ErrorCodes.OPERATION_FAILED,
        undefined,
        details,
        traceId,
      ),

    maintenanceMode: (details?: unknown, traceId?: string) =>
      new InternalException(
        ErrorCodes.MAINTENANCE_MODE,
        undefined,
        details,
        traceId,
      ),
  };
}
