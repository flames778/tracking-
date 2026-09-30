import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';

/**
 * The Socket.IO server needs the HTTP server, so it is created and attached
 * in `main.ts` (and in the e2e suite) rather than injected as a provider.
 */
@Module({
  imports: [JwtModule.register({})],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
