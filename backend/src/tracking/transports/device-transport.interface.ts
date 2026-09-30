export interface DeviceTransport {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  readonly running: boolean;
}
