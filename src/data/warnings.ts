import { TieredWarning, EngineId } from '../types';

export const ALL_WARNINGS: TieredWarning[] = [
  // ==========================================
  // B58 TIER 1 WARNINGS (WILL BREAK)
  // ==========================================
  {
    id: 'b58_zf8_torque_limit',
    engineId: 'b58_gen2',
    minWhpTrigger: 430,
    tier: 1,
    title: 'ZF8 Transmission Torque Cut & Slip (Missing TCU Flash)',
    description: 'Stage 2 torque output exceeds factory ZF8 torque limiters (~500 Nm). Without xHP transmission software, the TCU will aggressively pull timing, cause harsh gear slams, and cause internal clutch slip in 3rd & 6th gear.',
    preventiveCost: 350, // xHP flash
    failureCost: 4800, // Transmission rebuild/replacement
    evidenceSource: 'Bimmerpost: "ZF8 slip on Stage 2 E30 without xHP - clutch log telemetry"',
    evidenceUrl: 'https://f30.bimmerpost.com/forums/showthread.php?t=1658421',
    requiredPartId: 'b58_xhp_tcu_flash'
  },
  {
    id: 'b58_gen1_chargepipe_burst',
    engineId: 'b58_gen1',
    minWhpTrigger: 410,
    tier: 1,
    title: 'Gen 1 OEM Plastic Chargepipe Explosion',
    description: 'The stock BMW plastic chargepipe uses thin composite material. Boosting above 17 PSI causes the plastic neck near the throttle body to fracture instantly. Plastic fragments can enter the intake manifold.',
    preventiveCost: 340, // Aluminum charge pipe
    failureCost: 1200, // Tow + intake manifold cleanup
    evidenceSource: 'Bimmerpost: "Gen 1 B58 chargepipe exploded at 19 PSI - pictures & logs"',
    evidenceUrl: 'https://f30.bimmerpost.com/forums/showthread.php?t=1542109',
    requiredPartId: 'b58_ftp_chargepipe'
  },
  {
    id: 'b58_stock_internals_limit',
    engineId: 'b58_gen2',
    minWhpTrigger: 560,
    tier: 1,
    title: 'Connecting Rod / Piston Failure Above ~560 WHP',
    description: 'Pushing stock Gen 1 or Gen 2 B58 rods past 580 WHP / 600 WTQ under low-RPM heavy boost builds cylinder wall torque stress. Connecting rod flex leads to catastrophic engine block ventilation.',
    preventiveCost: 2400, // Forged rod & piston upgrade labor
    failureCost: 11500, // Complete crate engine replacement
    evidenceSource: 'SupramkV: "B58 Rod Failure at 610 WHP on E85 - Teardown Analysis"',
    evidenceUrl: 'https://www.supramkv.com/threads/b58-rod-failure-analysis.8920/'
  },

  // ==========================================
  // B58 TIER 2 WARNINGS (SHORTENS LIFE)
  // ==========================================
  {
    id: 'b58_spark_plug_erosion',
    engineId: 'b58_gen2',
    minWhpTrigger: 420,
    tier: 2,
    title: 'High Boost Spark Plug Wear (0.022" Gap Required)',
    description: 'Stock NGK plug gap (0.030") causes high-RPM spark blowout under 18+ PSI. Plug service interval drops from OEM 30,000 miles down to 10,000 miles on Stage 2 / E85 maps.',
    preventiveCost: 140, // Colder NGK SILZKGR8B8S plugs
    failureCost: 650, // Misfire limp mode + tow
    evidenceSource: 'Bimmerpost: "B58 Misfire Guide - Plug Gap & Coil Maintenance"'
  },
  {
    id: 'b58_hpfp_crash',
    engineId: 'b58_gen1',
    minWhpTrigger: 440,
    tier: 2,
    title: 'Gen 1 Fuel Pump Lean Crash on High Ethanol',
    description: 'Running >E30 blend on stock Gen 1 HPFP causes fuel rail pressure to drop from 200 bar to <80 bar under load. Lean air/fuel ratio triggers high cylinder temps.',
    preventiveCost: 620, // TU HPFP upgrade
    failureCost: 3500, // Melted spark plug electrode / valve edge
    evidenceSource: 'Bimmerpost: "HPFP crash on Stage 2 E50 map log breakdown"'
  },

  // ==========================================
  // B58 TIER 3 WARNINGS (KNOW THIS)
  // ==========================================
  {
    id: 'b58_carb_readiness',
    engineId: 'b58_gen2',
    minWhpTrigger: 400,
    tier: 3,
    title: 'Emissions & Inspection Readiness (Catless Downpipe)',
    description: 'Removing factory catalyst causes O2 sensor readiness monitors to fail state OBD-II inspections (e.g. CA Smog, NY, TX). Flashing tune disables CEL but readiness monitors will remain Unready.',
    preventiveCost: 0,
    failureCost: 250, // Re-inspection fee / swap back labor
    evidenceSource: 'EPA Clean Air Act & Regional Smog Compliance Guidelines'
  },

  // ==========================================
  // VR30 / VQ WARNINGS
  // ==========================================
  {
    id: 'vr30_heat_soak_limp',
    engineId: 'vr30_luxe',
    minWhpTrigger: 370,
    tier: 1,
    title: 'VR30 Thermal Heat Soak & ECU Power Cut (Stock Intercooler)',
    description: 'The stock VR30 water-to-air heat exchanger heat soaks rapidly. Intake air temperatures exceed 150°F after 2 wide open throttle pulls, causing the ECU to pull up to 80 WHP and trigger protection mode.',
    preventiveCost: 799, // AMS Heat Exchanger
    failureCost: 1800, // Repeated thermal cycles warping plastic coolant reservoirs
    evidenceSource: 'Q50 Forum: "VR30 IAT log analysis - Stock vs AMS Heat Exchanger"',
    evidenceUrl: 'https://www.q50.org/threads/vr30-iat-heat-soak.134001/'
  },
  {
    id: 'vr30_turbo_seal_fail',
    engineId: 'vr30_luxe',
    minWhpTrigger: 430,
    tier: 1,
    title: 'Stock VR30 Turbo Shaft Play & Oil Seal Blowout',
    description: 'Factory Honeywell turbos on 2016-2020 Q50/Q60 feature fragile turbine oil seals. Pushing boost past 18 PSI on stock turbos risks oil blow-by through the exhaust and turbo bearing failure.',
    preventiveCost: 2800, // Upgraded Pure/Z1 turbos
    failureCost: 6200, // Blown turbo oil seal smoke + turbo replacement
    evidenceSource: 'Infiniti Q50/Q60 Technical Bulletin: "VR30 Turbo Oil Seal Play Inspection"',
    evidenceUrl: 'https://www.q50.org/threads/vr30-turbo-failure-master-thread.138800/'
  },
  {
    id: 'vr30_pcv_blowby',
    engineId: 'vr30_redsport',
    minWhpTrigger: 380,
    tier: 2,
    title: 'PCV Oil Sludge Accumulation on Direct Injection Valves',
    description: 'High boost direct injection engines coat intake valves with oil mist. Installing a dual baffled catch can captures liquid blow-by before it bakes into rock-hard carbon deposits.',
    preventiveCost: 285, // Dual catch can
    failureCost: 950, // Walnut blasting intake valve cleaning service
    evidenceSource: 'Z1 Motorsports Tech Article: "VR30 Intake Valve Carbon Deposits & Catch Cans"'
  }
];

export function getWarningsForBuild(engineId: EngineId, targetWhp: number): TieredWarning[] {
  return ALL_WARNINGS.filter(w => w.engineId === engineId && targetWhp >= w.minWhpTrigger);
}
