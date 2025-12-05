import { stdSerializers } from 'pino';
import { countryZh, lookupIP } from '@/common/utils/geoip-lite';
import { getRegionFromTimezone } from 'jmni';
import * as parser from 'accept-language-parser';
import { UAParser } from 'ua-parser-js';
import { normalizeUserAgentInfo } from '@/common/utils/normalizeUserAgentInfo';

export const serializers = {
    req(input) {
      const { id, method, url } = stdSerializers.req(input);

      // 从原始 headers 里再拿我们关心的
      const headers = input.headers || {};
      const host = headers['host'] || '';
      const referer = headers['referer'] || headers['referrer'] || '';
      const userAgent = headers['user-agent'] || '';
      const acceptLanguage = parser.parse(headers['accept-language'] || '')[0];
      const userTimezone = headers['x-user-timezone'] || '';

      // 真实 IP 提取逻辑（同之前）
      const forwarded = headers['x-forwarded-for'];
      const first = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === 'string'
          ? forwarded.split(',')[0].trim()
          : undefined;
      const remoteAddress =
        first ||
        headers['x-real-ip'] ||
        (input.socket && input.socket.remoteAddress);

      // const u = (input as any).authUser || (input as any).user;
      // let user;
      // if (u) {
      //     user = {
      //       id: u.id, uid: u.uid, typ: u.typ, pv: u.pv, role: u.role,
      //     };
      //   }

      return {
        id,
        method,
        url,
        remote_address: remoteAddress,
        ip_info: lookupIP(remoteAddress) ?? undefined,
        referer,
        host,
        user_agent: normalizeUserAgentInfo(UAParser(userAgent)),
        x_user_timezone: getRegionFromTimezone(userTimezone || 'null'),
        accept_language: `${countryZh(acceptLanguage?.region)}-${acceptLanguage?.code}`,
      };
    },
  }
