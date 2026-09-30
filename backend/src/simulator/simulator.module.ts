import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { SimulatorController } from './simulator.controller';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [TrackingModule],
  providers: [SimulatorService],
  controllers: [SimulatorController],
  exports: [SimulatorService],
})
export class SimulatorModule {}
