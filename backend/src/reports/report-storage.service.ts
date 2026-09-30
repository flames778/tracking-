import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * Local filesystem report storage. Deliberately swappable for S3/GCS later —
 * the processor and controller only depend on this interface. File names are
 * derived from the report id, so no untrusted path segment ever reaches disk.
 */
@Injectable()
export class ReportStorageService {
  private readonly logger = new Logger(ReportStorageService.name);
  private readonly root = path.resolve(
    process.env.REPORT_STORAGE_DIR ?? path.join(process.cwd(), 'storage', 'reports'),
  );

  async init() {
    await fs.mkdir(this.root, { recursive: true });
  }

  private fileFor(reportId: string, format: string) {
    const ext = format === 'pdf' ? 'pdf' : 'csv';
    const safeId = reportId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeId) throw new Error('invalid report id');
    return path.join(this.root, `${safeId}.${ext}`);
  }

  async write(reportId: string, format: string, contents: Buffer | string) {
    const file = this.fileFor(reportId, format);
    await fs.mkdir(this.root, { recursive: true });
    await fs.writeFile(file, contents);
    this.logger.log(`stored report ${reportId} (${format}) at ${file}`);
    return file;
  }

  async read(reportId: string, format: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.fileFor(reportId, format));
    } catch {
      return null;
    }
  }

  async remove(reportId: string, format: string) {
    await fs.unlink(this.fileFor(reportId, format)).catch(() => null);
  }
}
