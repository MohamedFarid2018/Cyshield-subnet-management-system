/**
 * Validate CIDR notation  e.g. 192.168.1.0/24
 */
export function isValidCIDR(cidr: string): boolean {
  const cidrRegex =
    /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\/(3[0-2]|[12]?\d)$/;
  return cidrRegex.test(cidr);
}

/**
 * Validate a single IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
  const ipRegex =
    /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  return ipRegex.test(ip);
}

/**
 * Given a CIDR block, return network info
 */
export function subnetInfo(cidr: string): {
  networkAddress: string;
  broadcastAddress: string;
  firstUsable: string;
  lastUsable: string;
  totalHosts: number;
  usableHosts: number;
  prefixLength: number;
} | null {
  if (!isValidCIDR(cidr)) return null;

  const [ipPart, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  const ipParts = ipPart.split('.').map(Number);

  const ipInt =
    ((ipParts[0] << 24) |
      (ipParts[1] << 16) |
      (ipParts[2] << 8) |
      ipParts[3]) >>>
    0;

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const networkInt = (ipInt & mask) >>> 0;
  const broadcastInt = (networkInt | (~mask >>> 0)) >>> 0;

  const intToIp = (n: number) =>
    [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

  const totalHosts = Math.pow(2, 32 - prefix);
  const usableHosts = prefix >= 31 ? totalHosts : Math.max(0, totalHosts - 2);

  return {
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    firstUsable: prefix >= 31 ? intToIp(networkInt) : intToIp(networkInt + 1),
    lastUsable:
      prefix >= 31 ? intToIp(broadcastInt) : intToIp(broadcastInt - 1),
    totalHosts,
    usableHosts,
    prefixLength: prefix,
  };
}

/**
 * Check whether an IP belongs to a subnet
 */
export function ipBelongsToSubnet(ip: string, cidr: string): boolean {
  if (!isValidIPv4(ip) || !isValidCIDR(cidr)) return false;

  const [subnetIp, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);

  const toInt = (addr: string) => {
    const parts = addr.split('.').map(Number);
    return (
      ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
    );
  };

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (toInt(ip) & mask) === (toInt(subnetIp) & mask);
}
