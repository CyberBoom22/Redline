import { SoundClip } from '../types';

export const SOUND_CLIPS: SoundClip[] = [
  {
    id: 'b58_catted_valved',
    title: 'B58 High-Flow Catted DP + OEM Valved Exhaust',
    engineId: 'b58_gen2',
    setupDescription: 'CTS 200-Cell Catted Downpipe with OEM dual-mode electronic exhaust valve.',
    volumeRating: 6,
    droneRating: 1,
    carbCompliant: false,
    hasCattedDP: true,
    notes: 'In Comfort Mode valves close: near-stock silent highway cruising. In Sport Plus: deep inline-6 burbles and crisp upshift crackles.',
    audioFreqs: [40, 60, 110, 220, 350, 480, 600, 750, 500, 300, 120]
  },
  {
    id: 'b58_catless_straight',
    title: 'B58 4.5" Catless DP + Resonator Delete',
    engineId: 'b58_gen2',
    setupDescription: 'VRSF Catless Downpipe with straight pipe midsection.',
    volumeRating: 9,
    droneRating: 4,
    carbCompliant: false,
    hasCattedDP: false,
    notes: 'Extremely aggressive pops and gunshots on decal. Noticeable 2,200 RPM highway drone and raw exhaust odor at red lights.',
    audioFreqs: [80, 150, 300, 550, 800, 950, 900, 700, 450, 250, 100]
  },
  {
    id: 'vr30_fast_intentions_ldp',
    title: 'VR30 Fast Intentions LDP + Z1 Touring Exhaust',
    engineId: 'vr30_redsport',
    setupDescription: 'Fast Intentions Lower Downpipes paired with 3" dual stainless exhaust.',
    volumeRating: 7,
    droneRating: 2,
    carbCompliant: false,
    hasCattedDP: true,
    notes: 'Classic muscular VR twin-turbo resonance without rasp. Maintains factory primary cats for odor elimination.',
    audioFreqs: [50, 90, 160, 280, 420, 580, 620, 480, 310, 180, 80]
  },
  {
    id: 'vq37_admin_intake_single_exit',
    title: 'VQ37VHR 3" Long Tube Intakes + Tomei Titanium Exhaust',
    engineId: 'vq37vhr',
    setupDescription: 'AdminTuning 3" Long Tube Intakes with Tomei Expreme Ti Titanium Catback.',
    volumeRating: 10,
    droneRating: 5,
    carbCompliant: false,
    hasCattedDP: false,
    notes: 'Screaming 7,500 RPM N/A VVEL intake roar and ultra loud titanium exhaust note. High cabin drone above 65 MPH.',
    audioFreqs: [100, 220, 450, 750, 980, 1000, 950, 800, 600, 380, 200]
  }
];
