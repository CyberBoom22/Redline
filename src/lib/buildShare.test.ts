import { describe, expect, test } from 'bun:test';
import { decodeBuild, encodeBuild, SharedBuild, stripBuildParams } from './buildShare';
import { DEFAULT_VEHICLE } from '../data/platforms';

const build: SharedBuild = {
  vehicle: { ...DEFAULT_VEHICLE, vin: 'WBA5R1C50KA000000' },
  goalWhp: 500,
  ownedPartIds: ['b58_bootmod3', 'b58_oem_filter_dropin'],
  acknowledgedWarningIds: [],
};

const roundTrip = (params: URLSearchParams) => decodeBuild(new URLSearchParams(params.toString()));

describe('build share links', () => {
  test('round-trips a build', () => {
    const decoded = roundTrip(encodeBuild(build));
    expect(decoded).toEqual({ ...build, vehicle: { ...build.vehicle, vin: '' } });
  });

  test('never puts the VIN in the link', () => {
    expect(encodeBuild(build).toString()).not.toContain('WBA5R1C50KA000000');
  });

  test('returns null without a share link', () => {
    expect(decodeBuild(new URLSearchParams(''))).toBeNull();
    expect(decodeBuild(new URLSearchParams('utm_source=x'))).toBeNull();
  });

  test('rejects an unknown engine or one from another platform', () => {
    const params = encodeBuild(build);
    params.set('e', 'not_an_engine');
    expect(roundTrip(params)).toBeNull();
    params.set('e', 'vq37vhr');
    expect(roundTrip(params)).toBeNull();
  });

  test('drops unknown parts, other engines\' parts and duplicates', () => {
    const params = encodeBuild(build);
    params.set('o', 'b58_bootmod3,b58_bootmod3,vr30_ecutek_tune,<script>');
    expect(roundTrip(params)?.ownedPartIds).toEqual(['b58_bootmod3']);
  });

  test('clamps the goal into the slider range', () => {
    const params = encodeBuild(build);
    params.set('g', '99999');
    expect(roundTrip(params)?.goalWhp).toBe(690); // 390 stock + 300
    params.set('g', '-5');
    expect(roundTrip(params)?.goalWhp).toBe(390);
    params.set('g', 'abc');
    expect(roundTrip(params)?.goalWhp).toBe(500); // stock + 110
    params.delete('g');
    expect(roundTrip(params)?.goalWhp).toBe(500);
  });

  test('repairs a chassis or trim that does not belong to the engine', () => {
    const params = encodeBuild(build);
    params.set('c', 'Made Up Chassis');
    params.set('tr', 'Hovercraft');
    const decoded = roundTrip(params);
    expect(decoded?.vehicle.chassis).toBe('G20 (3 Series)');
    expect(decoded?.vehicle.transmission).toBe('ZF8 Speed Auto');
  });

  test('strips only its own parameters', () => {
    const params = encodeBuild(build);
    params.set('utm_source', 'forum');
    expect(stripBuildParams(params).toString()).toBe('utm_source=forum');
  });
});
