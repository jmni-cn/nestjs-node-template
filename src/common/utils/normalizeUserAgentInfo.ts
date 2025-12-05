import type { IResult } from 'ua-parser-js';

/**
 * 结构化并标准化 UA 解析结果，便于日志存储与查询。
 * @param uaInfo ua-parser-js 返回的原始解析结果
 * @returns 格式化后的用户环境信息
 */
export function normalizeUserAgentInfo(uaInfo: IResult) {
  const { browser, os, device, cpu, engine } = uaInfo;

  const browserName = safeJoin(browser.name, browser.version);
  const osName = safeJoin(os.name, os.version);
  const engineName = safeJoin(engine.name, engine.version);
  const deviceName = safeJoin(device.vendor, device.model);

  const deviceType = device.type ?? 'unknown';
  const isMobile = deviceType.toLowerCase() === 'mobile';
  let label = '';
  if (deviceName) {
    label += deviceName;
  }
  if (osName) {
    label += label ? `, ${osName}` : osName;
  }
  if (browserName) {
    label += label ? `, ${browserName}` : browserName;
  }
  if (engineName) {
    label += label ? `, ${engineName}` : engineName;
  }
  if (!label) {
    label = 'unknown';
  }

  return {
    // browser: browserName || 'unknown',
    // os: osName || 'unknown',
    // engine: engineName || 'unknown',
    // device: deviceName || 'unknown',
    // device_type: deviceType,
    is_mobile: isMobile,
    // cpu_architecture: cpu.architecture ?? 'unknown',
    label,
    ...uaInfo,
  };
}

/**
 * 拼接名称和版本，截取前两个版本段（如 8.0.61 -> 8.0）
 */
function safeJoin(name?: string, version?: string): string | undefined {
  if (!name) return undefined;
  if (!version) return name;
  return `${name} ${formatVersion(version)}`;
}

/**
 * 提取版本号的主次版本（例如 138.0.7204.157 -> 138.0）
 */
function formatVersion(version: string): string {
  return version.split('.').slice(0, 2).join('.');
}
