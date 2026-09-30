import { Injectable } from '@nestjs/common';
import {
  ParsedTelemetry,
  TrackingProtocolAdapter,
} from './protocol-adapter.interface';

/**
 * PLACEHOLDER — DO NOT enable in production.
 *
 * The C003F proprietary protocol is UNKNOWN. This class is an explicit
 * boundary marker so `C003FTransport → C003FProtocolAdapter → ParsedTelemetry`
 * can be dropped in later without touching domain code.
 *
 * When documentation arrives, implement canHandle/parse/buildResponse
 * against REAL packet samples and add fixtures under test/.
 */
@Injectable()
export class C003FProtocolAdapter implements TrackingProtocolAdapter {
  readonly name = 'C003F';

  canHandle(_message: Buffer | string): boolean {
    // Unknown protocol → never claim a message. Prevents accidental activation.
    return false;
  }

  parse(_message: Buffer | string): ParsedTelemetry | null {
    throw new Error(
      'C003F protocol documentation required — refusing to guess packet format',
    );
  }

  buildResponse(_message: Buffer | string): Buffer | string | null {
    throw new Error(
      'C003F protocol documentation required — refusing to guess ACK format',
    );
  }
}
