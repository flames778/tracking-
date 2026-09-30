import { Injectable } from '@nestjs/common';
import { C003FProtocolAdapter } from './c003f.adapter';
import { GenericJsonAdapter } from './generic-json.adapter';
import { TrackingProtocolAdapter } from './protocol-adapter.interface';

@Injectable()
export class ProtocolRegistry {
  private adapters: TrackingProtocolAdapter[];

  constructor(
    private c003f: C003FProtocolAdapter,
    private generic: GenericJsonAdapter,
  ) {
    // Order matters: specific adapters first, generic last.
    this.adapters = [c003f, generic];
  }

  resolve(message: Buffer | string): TrackingProtocolAdapter | null {
    for (const a of this.adapters) {
      try {
        if (a.canHandle(message)) return a;
      } catch {
        continue;
      }
    }
    return null;
  }
}
