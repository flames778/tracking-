import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportStorageService } from './report-storage.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportStorageService],
  exports: [ReportStorageService],
})
export class ReportsModule {}
