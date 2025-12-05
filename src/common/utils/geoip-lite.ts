import * as geoip from 'geoip-lite';
import * as countries from 'i18n-iso-countries';
countries.registerLocale(require('i18n-iso-countries/langs/zh.json'));
export function countryZh(code) {
  return countries.getName(code, 'zh') || code;
}

export function lookupIP(ip: string) {
  if (!ip) return null;
  const geo = geoip.lookup(ip);
  if (!geo) {
    return null;
  }
  return {
    label: countryZh(geo.country) + '-' + geo.region + '-' + geo.city,
    country: geo.country, // 国家代码，如 "CN"
    region: geo.region, // 省/州代码，如 "BJ"
    city: geo.city, // 城市名称，如 "Beijing"
    ll: geo.ll, // [纬度, 经度]
    timezone: geo.timezone, // IANA 时区数据库中定义的时区（如 "Europe/Paris"）
    // range: geo.range,      // [/* IP 段起始地址 */, /* IP 段结束地址 */]
    // metro: geo.metro,      // 美国大都市区代码（Metro Code）
    // area: geo.area,        // 以千米为单位的经纬度精度半径
    // eu: geo.eu,            // 若该国家为欧盟成员国则为 '1'，否则为 '0'
  };
}
