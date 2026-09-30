import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QUEUES } from '../../config/constants';
import { ReportStorageService } from '../../reports/report-storage.service';

/** Async report worker: aggregates from Postgres, writes a real file. */
@Processor(QUEUES.REPORT)
export class ReportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportProcessor.name);
  constructor(
    private prisma: PrismaService,
    private storage: ReportStorageService,
  ) {
    super();
  }

  async process(job: Job) {
    const { reportId } = job.data as { reportId: string };
    this.logger.log(`processing report ${reportId}`);
    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'PROCESSING' },
    }).catch(() => null);
    try {
      const report = await this.prisma.report.findUnique({ where: { id: reportId } });
      if (!report) throw new Error('report not found');
      const params = (report.parameters as any) ?? {};
      const { data } = await this.buildDataset(report.organizationId, report.type as string, params);
      const format = report.fileFormat === 'pdf' ? 'pdf' : 'csv';
      const contents =
        format === 'pdf' ? toPdf(data, report.type) : toCsv(data);
      await this.storage.write(reportId, format, contents);
      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'COMPLETED',
          fileFormat: format,
          fileUrl: `/api/v1/reports/${reportId}/download`,
          parameters: { ...(params as object), rowCount: data.length } as any,
        },
      });
      return { rowCount: data.length, format };
    } catch (e: any) {
      await this.prisma.report.update({
        where: { id: reportId },
        data: { status: 'FAILED', error: e.message?.slice(0, 500) },
      }).catch(() => null);
      throw e;
    }
  }

  private async buildDataset(orgId: string, type: string, params: any) {
    const from = params.dateFrom ? new Date(params.dateFrom) : new Date(Date.now() - 7 * 864e5);
    const to = params.dateTo ? new Date(params.dateTo) : new Date();
    const vehicleFilter = params.vehicleId ? { vehicleId: params.vehicleId } : {};
    switch (type) {
      case 'TRIP_HISTORY':
      case 'TRIP_SUMMARY': {
        const rows = await this.prisma.trip.findMany({
          where: { organizationId: orgId, startedAt: { gte: from, lte: to }, ...vehicleFilter },
          orderBy: { startedAt: 'desc' },
          take: 5000,
        });
        return { data: rows };
      }
      case 'ALERTS': {
        const rows = await this.prisma.alert.findMany({
          where: { organizationId: orgId, occurredAt: { gte: from, lte: to }, ...vehicleFilter },
          orderBy: { occurredAt: 'desc' },
          take: 5000,
        });
        return { data: rows };
      }
      case 'FUEL':
      case 'FUEL_USAGE': {
        const rows = await this.prisma.fuelEvent.findMany({
          where: { organizationId: orgId, timestamp: { gte: from, lte: to }, ...vehicleFilter },
          orderBy: { timestamp: 'desc' },
          take: 5000,
        });
        return { data: rows };
      }
      case 'GEOFENCE':
      case 'GEOFENCE_EVENTS': {
        const rows = await this.prisma.geofenceEvent.findMany({
          where: { organizationId: orgId, timestamp: { gte: from, lte: to }, ...vehicleFilter },
          orderBy: { timestamp: 'desc' },
          take: 5000,
        });
        return { data: rows };
      }
      default: {
        const rows = await this.prisma.vehicle.findMany({
          where: { organizationId: orgId, deletedAt: null },
          include: { latestState: true },
        });
        return { data: rows };
      }
    }
  }
}

function toCsv(rows: any[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]).filter((k) => typeof (rows[0] as any)[k] !== 'object');
  const esc = (v: unknown) => {
    if (v == null) return '';
    const s = String(v instanceof Date ? (v as Date).toISOString() : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc((r as any)[k])).join(','))].join('\n');
}

/**
 * Minimal single-page PDF writer (no external dependency, no network calls).
 * Renders the dataset as a simple text table. Swap for a real PDF service if
 * branded documents are ever required.
 */
function toPdf(rows: any[], title: string): Buffer {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const lines: string[] = [`${title.replace(/_/g, ' ')} - ${new Date().toISOString()}`];
  for (const row of rows.slice(0, 400)) {
    const cols = Object.entries(row)
      .filter(([, v]) => typeof v !== 'object' || v instanceof Date)
      .slice(0, 6)
      .map(([k, v]) => `${k}=${v instanceof Date ? v.toISOString() : v ?? ''}`)
      .join('  ');
    lines.push(esc(cols.slice(0, 200)));
  }
  let text = '';
  lines.forEach((l, i) => {
    if (i > 0) text += '\n';
    text += l;
  });

  const content = `BT /F1 8 Tf 12 TL 40 ${760 - lines.length * 8} Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, idx) => {
    offsets.push(pdf.length);
    pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
