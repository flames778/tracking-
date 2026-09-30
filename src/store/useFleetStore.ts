import { create } from 'zustand';
import { Vehicle, VehicleTelemetry, Alert } from '@/types';
import { SimulatorTelemetryProvider } from '@/services/telemetry';

// Mock Vehicles
export const MOCK_VEHICLES: Vehicle[] = [
  { id: 'v-001', name: 'Toyota Camry', registrationNumber: 'KJA-123XD', organizationId: 'org-1', type: 'Sedan', status: 'online', hasFuelSensor: true, createdAt: new Date().toISOString() },
  { id: 'v-002', name: 'Toyota Hilux', registrationNumber: 'LND-456YY', organizationId: 'org-1', type: 'Pickup', status: 'online', hasFuelSensor: true, createdAt: new Date().toISOString() },
  { id: 'v-003', name: 'Mercedes Sprinter', registrationNumber: 'ABJ-789ZZ', organizationId: 'org-1', type: 'Van', status: 'offline', hasFuelSensor: false, createdAt: new Date().toISOString() },
  { id: 'v-004', name: 'Honda Accord', registrationNumber: 'EKY-321AA', organizationId: 'org-1', type: 'Sedan', status: 'online', hasFuelSensor: true, createdAt: new Date().toISOString() },
  { id: 'v-005', name: 'Toyota Hiace', registrationNumber: 'AAA-999BB', organizationId: 'org-1', type: 'Bus', status: 'online', hasFuelSensor: true, createdAt: new Date().toISOString() },
];

interface FleetState {
  vehicles: Vehicle[];
  telemetry: Record<string, VehicleTelemetry>;
  alerts: Alert[];
  isSimulating: boolean;
  selectedVehicleId: string | null;
  
  // Actions
  initialize: () => void;
  updateTelemetry: (data: VehicleTelemetry) => void;
  selectVehicle: (id: string | null) => void;
  addAlert: (alert: Alert) => void;
  markAlertRead: (id: string) => void;
}

// Global provider instance (in a real app, this might be managed differently, 
// e.g., via React context or initialized in a top-level component, 
// but for the simulator, a singleton is fine).
let providerInstance: SimulatorTelemetryProvider | null = null;

export const useFleetStore = create<FleetState>((set, get) => ({
  vehicles: MOCK_VEHICLES,
  telemetry: {},
  alerts: [],
  isSimulating: false,
  selectedVehicleId: null,

  initialize: () => {
    if (providerInstance) return;
    
    // Check environment (mock check for demo)
    const mode = process.env.NEXT_PUBLIC_TELEMETRY_MODE || 'simulator';
    
    if (mode === 'simulator') {
      const vehicleIds = get().vehicles.map(v => v.id);
      providerInstance = new SimulatorTelemetryProvider(vehicleIds);
      
      providerInstance.subscribe((data) => {
        get().updateTelemetry(data);
        
        // Simple client-side alert generation for demo
        if (data.speed > 100) {
           const existingRecentAlert = get().alerts.find(
             a => a.vehicleId === data.vehicleId && a.type === 'Overspeeding' && !a.isRead
           );
           if (!existingRecentAlert) {
             get().addAlert({
               id: `alt-${Date.now()}`,
               vehicleId: data.vehicleId,
               type: 'Overspeeding',
               severity: 'Critical',
               message: `Vehicle exceeded 100 km/h (${Math.round(data.speed)} km/h)`,
               timestamp: new Date().toISOString(),
               isRead: false
             });
           }
        }
      });
      
      providerInstance.connect();
      set({ isSimulating: true });
    }
  },
  
  updateTelemetry: (data: VehicleTelemetry) => {
    set((state) => ({
      telemetry: {
        ...state.telemetry,
        [data.vehicleId]: data
      },
      // Update vehicle status based on telemetry connection status
      vehicles: state.vehicles.map(v => 
        v.id === data.vehicleId 
          ? { ...v, status: data.connectionStatus } 
          : v
      )
    }));
  },
  
  selectVehicle: (id) => set({ selectedVehicleId: id }),
  
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  
  markAlertRead: (id) => set((state) => ({
    alerts: state.alerts.map(a => a.id === id ? { ...a, isRead: true } : a)
  })),
}));
