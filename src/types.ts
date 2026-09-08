export type PlatformId = 'b58' | 'vq_vr';

export type EngineId = 
  | 'b58_gen1'  // BMW F22 240i, F30 340i (320-350 whp stock)
  | 'b58_gen2'  // BMW G20 M340i, A90 Supra 2020-2021+ (380-400 whp stock)
  | 'vr30_luxe' // Infiniti Q50/Q60 3.0t (300 whp stock)
  | 'vr30_redsport' // Infiniti Q50/Q60 Red Sport (400 hp / 360 whp stock)
  | 'vq37vhr';  // Infiniti G37, 370Z N/A or Forced Induction (330 hp / 280 whp stock)

export type UserFlowDoor = 'goal_first' | 'inventory_first';

export type UserIntent = 'power' | 'sound' | 'repair';

export type PartCategory = 
  | 'tune' 
  | 'downpipe' 
  | 'intake' 
  | 'chargepipe_intercooler' 
  | 'fueling' 
  | 'turbo' 
  | 'exhaust' 
  | 'drivetrain';

export type PartTier = 'cheap' | 'mid' | 'expensive' | 'oem';

export interface Part {
  id: string;
  name: string;
  brand: string;
  engineIds: EngineId[];
  category: PartCategory;
  tier: PartTier;
  price: number;
  estLaborCost: number;
  whpGain: number;
  verdict: string; // The honest 1-line verdict
  description: string;
  installGuideUrl?: string;
  youtubeGuideUrl?: string;
  installTimeHours: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Pro Required';
  careType: 'serviceable' | 'replace_interval' | 'fit_and_forget';
  careInstructions?: string;
  careIntervalMiles?: number;
  isSupportingMod?: boolean;
  requiredForWhpOver?: number;
  soundRating?: {
    volume: number; // 1-10
    droneLevel: number; // 1-5
    carbCompliant: boolean;
  };
}

export type WarningTier = 1 | 2 | 3; // 1 = Will Break (Gated), 2 = Shortens Life, 3 = Know This

export interface TieredWarning {
  id: string;
  engineId: EngineId;
  minWhpTrigger: number;
  tier: WarningTier;
  title: string;
  description: string;
  preventiveCost: number;
  failureCost: number;
  evidenceSource: string;
  /** Optional: some warnings cite a source that has no stable public URL. */
  evidenceUrl?: string;
  requiredPartId?: string;
  acknowledged?: boolean;
}

export interface VehicleSelection {
  platformId: PlatformId;
  chassis: string;
  trim: string;
  engineId: EngineId;
  year: number;
  vin?: string;
  transmission: 'ZF8 Speed Auto' | '6-Speed Manual' | '7-Speed Auto' | 'DCT';
}

export interface DynoDataPoint {
  rpm: number;
  hpStock: number;
  tqStock: number;
  hpCurrent?: number;
  tqCurrent?: number;
  hpTarget?: number;
  tqTarget?: number;
  boostPsiStock?: number;
  boostPsiTarget?: number;
}

export interface UserDynoRun {
  id: string;
  date: string;
  title: string;
  dynoType: 'Dynojet' | 'Mustang Dyno' | 'Mainline' | 'Virtual Dyno';
  peakWhp: number;
  peakWtq: number;
  maxBoostPsi: number;
  fuelType: string;
  ambientTempF: number;
  notes: string;
  dataPoints: DynoDataPoint[];
}

export interface VettedTuner {
  id: string;
  name: string;
  location: string;
  specialties: string[];
  platformsSupported: PlatformId[];
  flashSoftware: string[];
  contactUrl: string;
  rating: number;
  reviewCount: number;
  verifiedHandshake: boolean;
}

export interface SoundClip {
  id: string;
  title: string;
  engineId: EngineId;
  setupDescription: string;
  volumeRating: number; // 1-10
  droneRating: number; // 1-5
  carbCompliant: boolean;
  hasCattedDP: boolean;
  notes: string;
  audioFreqs?: number[];
}
