import { isValidCIDR, isValidIPv4, ipBelongsToSubnet, subnetInfo } from '../../src/utils/network';

describe('isValidCIDR', () => {
  it('accepts valid CIDR blocks', () => {
    expect(isValidCIDR('192.168.1.0/24')).toBe(true);
    expect(isValidCIDR('10.0.0.0/8')).toBe(true);
    expect(isValidCIDR('172.16.0.0/12')).toBe(true);
    expect(isValidCIDR('0.0.0.0/0')).toBe(true);
    expect(isValidCIDR('255.255.255.255/32')).toBe(true);
  });

  it('rejects plain IP addresses without prefix', () => {
    expect(isValidCIDR('192.168.1.1')).toBe(false);
    expect(isValidCIDR('10.0.0.1')).toBe(false);
  });

  it('rejects invalid prefix lengths', () => {
    expect(isValidCIDR('192.168.1.0/33')).toBe(false);
    expect(isValidCIDR('192.168.1.0/-1')).toBe(false);
  });

  it('rejects out-of-range octets', () => {
    expect(isValidCIDR('256.168.1.0/24')).toBe(false);
    expect(isValidCIDR('192.168.1.999/24')).toBe(false);
  });

  it('rejects empty string and garbage input', () => {
    expect(isValidCIDR('')).toBe(false);
    expect(isValidCIDR('not-a-cidr')).toBe(false);
    expect(isValidCIDR('192.168.1.0')).toBe(false);
  });
});

describe('isValidIPv4', () => {
  it('accepts valid IPv4 addresses', () => {
    expect(isValidIPv4('192.168.1.1')).toBe(true);
    expect(isValidIPv4('0.0.0.0')).toBe(true);
    expect(isValidIPv4('255.255.255.255')).toBe(true);
    expect(isValidIPv4('10.0.0.1')).toBe(true);
  });

  it('rejects CIDR notation', () => {
    expect(isValidIPv4('192.168.1.0/24')).toBe(false);
  });

  it('rejects out-of-range octets', () => {
    expect(isValidIPv4('256.0.0.1')).toBe(false);
    expect(isValidIPv4('192.168.1.999')).toBe(false);
  });

  it('rejects incomplete addresses', () => {
    expect(isValidIPv4('192.168.1')).toBe(false);
    expect(isValidIPv4('192.168')).toBe(false);
    expect(isValidIPv4('')).toBe(false);
  });
});

describe('ipBelongsToSubnet', () => {
  it('returns true for IPs inside the subnet', () => {
    expect(ipBelongsToSubnet('192.168.1.1', '192.168.1.0/24')).toBe(true);
    expect(ipBelongsToSubnet('192.168.1.254', '192.168.1.0/24')).toBe(true);
    expect(ipBelongsToSubnet('10.0.0.1', '10.0.0.0/8')).toBe(true);
  });

  it('returns false for IPs outside the subnet', () => {
    expect(ipBelongsToSubnet('192.168.2.1', '192.168.1.0/24')).toBe(false);
    expect(ipBelongsToSubnet('172.16.0.1', '192.168.1.0/24')).toBe(false);
  });

  it('returns false for invalid inputs', () => {
    expect(ipBelongsToSubnet('not-an-ip', '192.168.1.0/24')).toBe(false);
    expect(ipBelongsToSubnet('192.168.1.1', 'not-a-cidr')).toBe(false);
  });
});

describe('subnetInfo', () => {
  it('returns correct info for /24', () => {
    const info = subnetInfo('192.168.1.0/24');
    expect(info).not.toBeNull();
    expect(info!.networkAddress).toBe('192.168.1.0');
    expect(info!.broadcastAddress).toBe('192.168.1.255');
    expect(info!.firstUsable).toBe('192.168.1.1');
    expect(info!.lastUsable).toBe('192.168.1.254');
    expect(info!.totalHosts).toBe(256);
    expect(info!.usableHosts).toBe(254);
  });

  it('returns correct info for /32', () => {
    const info = subnetInfo('10.0.0.1/32');
    expect(info).not.toBeNull();
    expect(info!.networkAddress).toBe('10.0.0.1');
    expect(info!.broadcastAddress).toBe('10.0.0.1');
    expect(info!.totalHosts).toBe(1);
    expect(info!.usableHosts).toBe(1);
  });

  it('returns null for invalid CIDR', () => {
    expect(subnetInfo('192.168.1.1')).toBeNull();
    expect(subnetInfo('bad-input')).toBeNull();
  });
});
