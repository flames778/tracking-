import { VehicleTelemetry } from "@/types";

export interface TelemetryProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(callback: (data: VehicleTelemetry) => void): () => void;
}

// Initial Nigerian coordinates for our simulation (Lagos area)
const START_POINTS = [
  { lat: 6.6018, lng: 3.3515, name: "Ikeja" },
  { lat: 6.4281, lng: 3.4219, name: "Victoria Island" },
  { lat: 6.4698, lng: 3.5852, name: "Lekki" },
  { lat: 6.5244, lng: 3.3792, name: "Yaba" },
  { lat: 6.4541, lng: 3.3686, name: "Apapa" },
];

export class SimulatorTelemetryProvider implements TelemetryProvider {
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: Set<(data: VehicleTelemetry) => void> = new Set();
  private vehicles: Map<string, VehicleTelemetry> = new Map();

  constructor(vehicleIds: string[]) {
    // Initialize vehicles with random starting data
    vehicleIds.forEach((id, index) => {
      const startPoint = START_POINTS[index % START_POINTS.length];
      this.vehicles.set(id, {
        vehicleId: id,
        timestamp: new Date().toISOString(),
        location: {
          latitude: startPoint.lat + (Math.random() - 0.5) * 0.01,
          longitude: startPoint.lng + (Math.random() - 0.5) * 0.01,
        },
        speed: Math.floor(Math.random() * 60),
        heading: Math.floor(Math.random() * 360),
        ignition: Math.random() > 0.2,
        fuel: {
          percentage: 40 + Math.floor(Math.random() * 60),
        },
        batteryVoltage: 12.0 + Math.random() * 1.5,
        connectionStatus: Math.random() > 0.1 ? 'online' : 'offline',
        odometer: 15000 + Math.floor(Math.random() * 50000),
      });
    });
  }

  async connect(): Promise<void> {
    if (this.intervalId) return;
    
    // Simulate incoming data every 2 seconds
    this.intervalId = setInterval(() => {
      this.simulateTick();
    }, 2000);
    
    console.log("Telemetry Simulator connected.");
  }

  async disconnect(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("Telemetry Simulator disconnected.");
  }

  subscribe(callback: (data: VehicleTelemetry) => void): () => void {
    this.subscribers.add(callback);
    
    // Immediately send the latest state for all vehicles upon subscription
    this.vehicles.forEach(vehicle => callback(vehicle));
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private simulateTick() {
    this.vehicles.forEach((vehicle, id) => {
      if (vehicle.connectionStatus === 'offline') {
        // Randomly bring back online
        if (Math.random() > 0.95) {
          vehicle.connectionStatus = 'online';
        }
        return;
      }

      // 5% chance to go offline
      if (Math.random() > 0.95) {
        vehicle.connectionStatus = 'offline';
        vehicle.speed = 0;
        this.notify(vehicle);
        return;
      }

      if (vehicle.ignition) {
        // Simulate movement
        const speedChange = (Math.random() - 0.5) * 10;
        vehicle.speed = Math.max(0, Math.min(120, vehicle.speed + speedChange));
        
        if (vehicle.speed > 0) {
          // Change heading slightly
          vehicle.heading = (vehicle.heading + (Math.random() - 0.5) * 20 + 360) % 360;
          
          // Move location based on speed and heading (rough approximation)
          const distancePerTick = (vehicle.speed * 1000) / 3600 * 2; // meters per 2 seconds
          const latChange = (distancePerTick * Math.cos(vehicle.heading * Math.PI / 180)) / 111320;
          const lngChange = (distancePerTick * Math.sin(vehicle.heading * Math.PI / 180)) / (111320 * Math.cos(vehicle.location.latitude * Math.PI / 180));
          
          vehicle.location.latitude += latChange;
          vehicle.location.longitude += lngChange;
          
          // Update odometer
          if (vehicle.odometer !== undefined) {
             vehicle.odometer += (distancePerTick / 1000);
          }
          
          // Decrease fuel slowly
          if (vehicle.fuel && Math.random() > 0.8) {
             vehicle.fuel.percentage = Math.max(0, vehicle.fuel.percentage - 0.1);
          }
        }
      }

      // Randomly toggle ignition if speed is 0
      if (vehicle.speed === 0 && Math.random() > 0.9) {
        vehicle.ignition = !vehicle.ignition;
      }

      vehicle.timestamp = new Date().toISOString();
      this.notify(vehicle);
    });
  }

  private notify(data: VehicleTelemetry) {
    this.subscribers.forEach(callback => callback({ ...data }));
  }
}
