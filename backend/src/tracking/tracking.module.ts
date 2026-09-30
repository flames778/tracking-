import { Module, forwardRef } from '@nestjs/common';
import { C003FProtocolAdapter } from './adapters/c003f.adapter';
import { GenericJsonAdapter } from './adapters/generic-json.adapter';
import { ProtocolRegistry } from './adapters/protocol-registry';
import { TrackingIngestionService } from './tracking-ingestion.service';
import { TrackingController } from './tracking.controller';
import { TripEngine } from './engines/trip.engine';
import { GeofenceEngine } from './engines/geofence.engine';
import { AlertEngine } from './engines/alert.engine';
import { FuelEngine } from './engines/fuel.engine';
import { SecondaryProcessingService } from './secondary-processing.service';
import { TcpDeviceTransport } from './transports/tcp.transport';
import { UdpDeviceTransport } from './transports/udp.transport';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  providers: [
    C003FProtocolAdapter,
    GenericJsonAdapter,
    ProtocolRegistry,
    TripEngine,
    GeofenceEngine,
    AlertEngine,
    FuelEngine,
    SecondaryProcessingService,
    TrackingIngestionService,
    TcpDeviceTransport,
    UdpDeviceTransport,
  ],
  controllers: [TrackingController],
  exports: [
    TrackingIngestionService,
    SecondaryProcessingService,
    ProtocolRegistry,
    C003FProtocolAdapter,
  ],
})
export class TrackingModule {}
