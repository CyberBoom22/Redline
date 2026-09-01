import { VettedTuner } from '../types';

export const VETTED_TUNERS: VettedTuner[] = [
  {
    id: 'puredrive',
    name: 'PureDrive Performance (Paul Johnson Tuning)',
    location: 'Remote / National (USA)',
    specialties: ['B58 Custom E-Tunes', 'Flex Fuel Ethanol Maps', 'Pure800 Turbo Calibration'],
    platformsSupported: ['b58'],
    flashSoftware: ['bootmod3 (BM3)', 'MHD Flasher'],
    contactUrl: 'https://puredriveperformance.com',
    rating: 4.95,
    reviewCount: 380,
    verifiedHandshake: true
  },
  {
    id: 'bend_calibration',
    name: 'Bend Calibration',
    location: 'Bend, OR (Remote / Dyno)',
    specialties: ['Track Safety Limits', 'Custom Flex Fuel Strategy', 'B58 / S58 Dyno Masters'],
    platformsSupported: ['b58'],
    flashSoftware: ['EcuTek', 'bootmod3'],
    contactUrl: 'https://www.bendcalibration.com',
    rating: 4.98,
    reviewCount: 240,
    verifiedHandshake: true
  },
  {
    id: 'admintuning',
    name: 'AdminTuning (Moncef Admin)',
    location: 'Houston, TX / Worldwide E-Tune',
    specialties: ['VQ37VHR Flame Maps', 'VR30 Twin Turbo E-Tune', '370Z / Q50 Dyno Tuning'],
    platformsSupported: ['vq_vr'],
    flashSoftware: ['EcuTek', 'Uprev'],
    contactUrl: 'https://www.admintuning.com',
    rating: 4.92,
    reviewCount: 620,
    verifiedHandshake: true
  },
  {
    id: 'z1_motorsports',
    name: 'Z1 Motorsports Performance Lab',
    location: 'Carrollton, GA',
    specialties: ['VR30DDTT Full Builds', 'VQ37 Supercharger Dyno Tunes', 'In-House Chassis Dyno'],
    platformsSupported: ['vq_vr'],
    flashSoftware: ['EcuTek'],
    contactUrl: 'https://www.z1motorsports.com',
    rating: 4.89,
    reviewCount: 890,
    verifiedHandshake: true
  },
  {
    id: 'visconti_tuning',
    name: 'Visconti Tuning',
    location: 'Remote / East Coast',
    specialties: ['GR Supra B58 Pioneers', 'EcuTek Flex Fuel Kits', 'Trans Tuning'],
    platformsSupported: ['b58', 'vq_vr'],
    flashSoftware: ['EcuTek'],
    contactUrl: 'https://www.viscontituning.com',
    rating: 4.88,
    reviewCount: 195,
    verifiedHandshake: true
  }
];
