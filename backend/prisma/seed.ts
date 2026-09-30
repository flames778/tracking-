import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-fleet' },
    update: { isDemo: true },
    create: {
      name: 'Demo Fleet (SIMULATED)',
      slug: 'demo-fleet',
      email: 'demo@example.com',
      timezone: 'Africa/Lagos',
      currency: 'NGN',
      isDemo: true,
    },
  });

  const mkUser = async (email: string, fullName: string, role: any) => {
    const passwordHash = await argon2.hash('Demo1234!');
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        organizationId: org.id,
        fullName,
        email,
        role,
        status: 'ACTIVE',
        passwordHash,
      },
    });
  };

  await mkUser('admin@demo.ng', 'Demo Admin', 'ADMIN');
  await mkUser('manager@demo.ng', 'Demo Fleet Manager', 'FLEET_MANAGER');
  await mkUser('viewer@demo.ng', 'Demo Viewer', 'VIEWER');

  const vehicles = [
    { name: 'Lagos Logistics Van 01', reg: 'DEMO-001', type: 'VAN' as const },
    { name: 'School Bus 01', reg: 'DEMO-002', type: 'BUS' as const },
    { name: 'Executive SUV 01', reg: 'DEMO-003', type: 'SUV' as const },
    { name: 'Fleet Truck 01', reg: 'DEMO-004', type: 'TRUCK' as const },
    { name: 'Private Car 01', reg: 'DEMO-005', type: 'CAR' as const },
  ];

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    const vehicle = await prisma.vehicle.upsert({
      where: {
        organizationId_registrationNumber: {
          organizationId: org.id,
          registrationNumber: v.reg,
        },
      },
      update: { isSimulated: true },
      create: {
        organizationId: org.id,
        name: v.name,
        registrationNumber: v.reg,
        vehicleType: v.type,
        status: 'ACTIVE',
        isSimulated: true,
      },
    });
    const imei = `860000000000${101 + i}`;
    await prisma.device.upsert({
      where: { imei },
      update: { organizationId: org.id, vehicleId: vehicle.id, status: 'ACTIVE', isSimulated: true },
      create: {
        organizationId: org.id,
        vehicleId: vehicle.id,
        imei,
        model: i === 3 ? 'OTHER_MODEL' : 'C003F',
        manufacturer: 'SIMULATED',
        status: 'ACTIVE',
        isSimulated: true,
      },
    });
  }

  // Geofences (demo)
  const gfCount = await prisma.geofence.count({ where: { organizationId: org.id } });
  if (gfCount === 0) {
    await prisma.geofence.createMany({
      data: [
        {
          organizationId: org.id,
          name: 'Main Office (Demo)',
          type: 'CIRCLE',
          centerLatitude: 6.4549,
          centerLongitude: 3.3947,
          radiusMeters: 800,
        },
        {
          organizationId: org.id,
          name: 'Warehouse (Demo)',
          type: 'CIRCLE',
          centerLatitude: 6.4433,
          centerLongitude: 3.3616,
          radiusMeters: 600,
        },
        {
          organizationId: org.id,
          name: 'School Campus (Demo)',
          type: 'POLYGON',
          polygon: [
            [3.37, 6.5],
            [3.38, 6.5],
            [3.38, 6.51],
            [3.37, 6.51],
          ],
        },
      ],
    });
  }

  const ruleCount = await prisma.alertRule.count({ where: { organizationId: org.id } });
  if (ruleCount === 0) {
    await prisma.alertRule.createMany({
      data: [
        { organizationId: org.id, type: 'OVERSPEED', configuration: { thresholdKph: 100 }, cooldownSeconds: 600 },
        { organizationId: org.id, type: 'LOW_FUEL', configuration: { thresholdPercent: 20 }, cooldownSeconds: 3600 },
        { organizationId: org.id, type: 'LOW_BATTERY', configuration: { thresholdVolts: 11.5 }, cooldownSeconds: 3600 },
      ],
    });
  }

  const planCount = await prisma.subscriptionPlan.count();
  if (planCount === 0) {
    const plans = await prisma.subscriptionPlan.createMany({
      data: [
        { name: 'FREE', monthlyPrice: 0, yearlyPrice: 0, vehicleLimit: 5, userLimit: 5, features: { reports: false } },
        { name: 'BASIC', monthlyPrice: 5000, yearlyPrice: 50000, vehicleLimit: 20, userLimit: 10, features: { reports: true } },
        { name: 'PRO', monthlyPrice: 15000, yearlyPrice: 150000, vehicleLimit: 100, userLimit: 50, features: { reports: true, api: true } },
        { name: 'ENTERPRISE', monthlyPrice: 50000, yearlyPrice: 500000, vehicleLimit: 1000, userLimit: 500, features: { reports: true, api: true, sso: true } },
      ],
    });
    void plans;
  }
  const pro = await prisma.subscriptionPlan.findFirst({ where: { name: 'PRO' } });
  const subCount = await prisma.subscription.count({ where: { organizationId: org.id } });
  if (subCount === 0) {
    await prisma.subscription.create({
      data: {
        organizationId: org.id,
        planId: pro?.id,
        planName: 'PRO',
        status: 'ACTIVE',
      },
    });
  }

  console.log('Seed complete: demo-fleet with 5 vehicles/devices/geofences/rules.');
  console.log('Logins (password Demo1234!): admin@demo.ng / manager@demo.ng / viewer@demo.ng');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
