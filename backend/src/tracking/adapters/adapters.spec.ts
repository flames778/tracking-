import { C003FProtocolAdapter } from './c003f.adapter';
import { GenericJsonAdapter } from './generic-json.adapter';

describe('protocol adapters', () => {
  it('C003F adapter refuses to guess (must throw until docs arrive)', () => {
    const adapter = new C003FProtocolAdapter();
    expect(adapter.canHandle(Buffer.from('anything'))).toBe(false);
    expect(() => adapter.parse(Buffer.from('anything'))).toThrow(
      /documentation required/,
    );
  });

  it('generic JSON adapter parses normalized telemetry', () => {
    const adapter = new GenericJsonAdapter();
    const msg = JSON.stringify({
      imei: '860000000000101',
      latitude: 6.5244,
      longitude: 3.3792,
      speedKph: 64,
      ignition: true,
    });
    expect(adapter.canHandle(msg)).toBe(true);
    const parsed = adapter.parse(msg)!;
    expect(parsed.imei).toBe('860000000000101');
    expect(parsed.latitude).toBe(6.5244);
    expect(parsed.speedKph).toBe(64);
  });

  it('generic adapter rejects malformed messages', () => {
    const adapter = new GenericJsonAdapter();
    expect(adapter.canHandle('not-json')).toBe(false);
    expect(adapter.parse('{"nope":true}')).toBeNull();
  });
});
