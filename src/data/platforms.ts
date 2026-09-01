import { EngineId, PlatformId, VehicleSelection, DynoDataPoint } from '../types';

export interface PlatformInfo {
  id: PlatformId;
  name: string;
  subtitle: string;
  badge: string;
  description: string;
  engines: {
    id: EngineId;
    name: string;
    stockWhp: number;
    stockWtq: number;
    stockBoostPsi: number;
    maxSafeStockInternalsWhp: number;
    chassisList: string[];
    trims: string[];
    vinPrefixes: string[];
  }[];
}

export const PLATFORMS: PlatformInfo[] = [
  {
    id: 'b58',
    name: 'BMW B58 3.0L Inline-6 Turbo',
    subtitle: 'Modular Inline-6 Single Twin-Scroll Turbo (B58B30M0 / B58B30O1)',
    badge: 'B58 Platform',
    description: 'Known as the modern 2JZ. Closed-deck aluminum block, forged crank/rods, twin-scroll turbocharger. Exceptional tuning headroom.',
    engines: [
      {
        id: 'b58_gen2',
        name: 'B58 Gen 2 / TU1 (382 hp stock / ~390 whp)',
        stockWhp: 390,
        stockWtq: 385,
        stockBoostPsi: 11.5,
        maxSafeStockInternalsWhp: 580,
        chassisList: ['G20 (3 Series)', 'G22/G23 (4 Series)', 'A90 (GR Supra)', 'G42 (2 Series)', 'G29 (Z4 M40i)'],
        trims: ['M340i / M340i xDrive', 'GR Supra 3.0 (2021+)', 'M240i xDrive (G42)', 'Z4 M40i'],
        vinPrefixes: ['WBA5R', 'W3MW', 'JY3A', '3MW5C', 'WBS']
      },
      {
        id: 'b58_gen1',
        name: 'B58 Gen 1 (320-335 hp stock / ~330 whp)',
        stockWhp: 330,
        stockWtq: 330,
        stockBoostPsi: 9.5,
        maxSafeStockInternalsWhp: 540,
        chassisList: ['F22 (2 Series)', 'F30/F31 (3 Series)', 'F32/F36 (4 Series)', 'G30 (5 Series)', 'A90 (GR Supra 2020)'],
        trims: ['M240i (F22)', '340i (F30)', '440i (F32)', 'GR Supra 3.0 (2020)'],
        vinPrefixes: ['WBA1J', 'WBA8B', 'WBA4W', 'WBA1B']
      }
    ]
  },
  {
    id: 'vq_vr',
    name: "Infiniti & Nissan VQ37 / VR30 Platform",
    subtitle: '3.7L V6 VHR & 3.0L Twin-Turbo VR30DDTT',
    badge: 'VQ / VR Platform',
    description: 'Infiniti legendary V6 line. VR30 twin-turbo offers massive bolt-on gains, while VQ37VHR high-revving N/A transforms with supercharger/single-turbo builds.',
    engines: [
      {
        id: 'vr30_redsport',
        name: 'VR30DDTT Red Sport 400 (400 hp stock / ~365 whp)',
        stockWhp: 365,
        stockWtq: 350,
        stockBoostPsi: 14.7,
        maxSafeStockInternalsWhp: 520,
        chassisList: ['V37 Q50 Red Sport', 'CV37 Q60 Red Sport', 'RZ34 Nissan Z (2023+)'],
        trims: ['Q50 Red Sport 400', 'Q60 Red Sport 400', 'Nissan Z Performance / Sport'],
        vinPrefixes: ['JN1CV', 'JN1EV', 'JN1AZ']
      },
      {
        id: 'vr30_luxe',
        name: 'VR30DDTT Luxe / Silver Sport (300 hp stock / ~285 whp)',
        stockWhp: 285,
        stockWtq: 295,
        stockBoostPsi: 9.2,
        maxSafeStockInternalsWhp: 500,
        chassisList: ['V37 Q50 Luxe/Pure', 'CV37 Q60 Luxe/Pure'],
        trims: ['Q50 3.0t Luxe / Pure / Sport', 'Q60 3.0t Luxe / Premium'],
        vinPrefixes: ['JN1EV', 'JN1CV']
      },
      {
        id: 'vq37vhr',
        name: 'VQ37VHR 3.7L VVEL V6 (330 hp stock / ~275 whp)',
        stockWhp: 275,
        stockWtq: 245,
        stockBoostPsi: 0.0,
        maxSafeStockInternalsWhp: 500,
        chassisList: ['V36 G37 / Q50 (2014-15)', 'CV36 G37 Coupe', 'Z34 370Z'],
        trims: ['G37 Journey / Sport / IPL', '370Z Sport / NISMO', 'Q50 3.7 V6'],
        vinPrefixes: ['JN1CV', 'JN1BJ', 'JN1AZ4']
      }
    ]
  }
];

export const DEFAULT_VEHICLE: VehicleSelection = {
  platformId: 'b58',
  chassis: 'G20 (3 Series)',
  trim: 'M340i / M340i xDrive',
  engineId: 'b58_gen2',
  year: 2021,
  transmission: 'ZF8 Speed Auto',
  vin: ''
};

// Generates benchmark dyno curves for stock vs current vs target
export function generateDynoCurveData(
  stockWhp: number,
  stockWtq: number,
  targetWhp: number,
  targetWtq: number,
  currentWhp?: number,
  currentWtq?: number
): DynoDataPoint[] {
  const points: DynoDataPoint[] = [];
  
  // RPM ranges from 2000 to 7000
  for (let rpm = 2000; rpm <= 7000; rpm += 250) {
    // Normalizing curve shapes
    const rpmFactorHp = Math.sin(((rpm - 2000) / 4500) * (Math.PI / 1.8)); // Peak around 5800-6300 RPM
    const rpmFactorTq = Math.sin(((rpm - 1800) / 3800) * (Math.PI / 1.7)); // Torque peaks earlier around 3200-4200 RPM
    
    // Low-end torque buildup
    const lowEndRamp = Math.min(1, (rpm - 2000) / 1200);

    const hpStock = Math.max(80, Math.round(stockWhp * rpmFactorHp * (0.55 + 0.45 * lowEndRamp)));
    const tqStock = Math.max(120, Math.round(stockWtq * rpmFactorTq * (0.6 + 0.4 * lowEndRamp)));
    
    const hpTarget = Math.max(90, Math.round(targetWhp * rpmFactorHp * (0.55 + 0.45 * lowEndRamp)));
    const tqTarget = Math.max(130, Math.round(targetWtq * rpmFactorTq * (0.6 + 0.4 * lowEndRamp)));

    const hpCurrent = currentWhp 
      ? Math.max(85, Math.round(currentWhp * rpmFactorHp * (0.55 + 0.45 * lowEndRamp)))
      : undefined;
    const tqCurrent = currentWtq
      ? Math.max(125, Math.round(currentWtq * rpmFactorTq * (0.6 + 0.4 * lowEndRamp)))
      : undefined;

    const boostPsiStock = Math.round((rpm < 2500 ? 5 : rpm > 6200 ? 8 : 11) * 10) / 10;
    const boostPsiTarget = Math.round((rpm < 2500 ? 8 : rpm > 6200 ? 15 : 21) * 10) / 10;

    points.push({
      rpm,
      hpStock,
      tqStock,
      hpTarget,
      tqTarget,
      hpCurrent,
      tqCurrent,
      boostPsiStock,
      boostPsiTarget
    });
  }

  return points;
}
