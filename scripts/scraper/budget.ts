import { promises as fs } from 'node:fs';
import path from 'node:path';
import { BudgetLedger, VendorId } from './types';

/**
 * Hard daily request cap, enforced at the HTTP layer so no code path can
 * spend more than the ledger allows. The ledger is persisted next to the
 * catalog and rolls over on the UTC date.
 */
export const DAILY_REQUEST_LIMIT = 100;

export class BudgetExhaustedError extends Error {
  constructor(readonly vendorId: VendorId | 'global') {
    super(
      vendorId === 'global'
        ? `Daily request budget of ${DAILY_REQUEST_LIMIT} is spent`
        : `Daily request budget for vendor "${vendorId}" is spent`,
    );
    this.name = 'BudgetExhaustedError';
  }
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class Budget {
  private ledger: BudgetLedger;

  private constructor(
    private readonly file: string,
    ledger: BudgetLedger,
    private readonly perVendorLimit: Record<string, number>,
  ) {
    this.ledger = ledger;
  }

  static async load(dir: string, perVendorLimit: Record<string, number>): Promise<Budget> {
    const file = path.join(dir, 'budget.json');
    let ledger: BudgetLedger;
    try {
      ledger = JSON.parse(await fs.readFile(file, 'utf8')) as BudgetLedger;
    } catch {
      ledger = { date: today(), limit: DAILY_REQUEST_LIMIT, used: 0, byVendor: {}, notModified: 0 };
    }
    if (ledger.date !== today()) {
      ledger = { date: today(), limit: DAILY_REQUEST_LIMIT, used: 0, byVendor: {}, notModified: 0 };
    }
    ledger.limit = DAILY_REQUEST_LIMIT;
    return new Budget(file, ledger, perVendorLimit);
  }

  get used(): number {
    return this.ledger.used;
  }

  get remaining(): number {
    return Math.max(0, this.ledger.limit - this.ledger.used);
  }

  usedBy(vendorId: VendorId): number {
    return this.ledger.byVendor[vendorId] ?? 0;
  }

  remainingFor(vendorId: VendorId): number {
    const cap = this.perVendorLimit[vendorId] ?? this.ledger.limit;
    return Math.max(0, Math.min(cap - this.usedBy(vendorId), this.remaining));
  }

  /** Reserve one request or throw. Call this immediately before every fetch. */
  spend(vendorId: VendorId): void {
    if (this.remaining <= 0) throw new BudgetExhaustedError('global');
    if (this.remainingFor(vendorId) <= 0) throw new BudgetExhaustedError(vendorId);
    this.ledger.used += 1;
    this.ledger.byVendor[vendorId] = this.usedBy(vendorId) + 1;
  }

  recordNotModified(): void {
    this.ledger.notModified += 1;
  }

  snapshot(): BudgetLedger {
    return { ...this.ledger, byVendor: { ...this.ledger.byVendor } };
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, `${JSON.stringify(this.ledger, null, 2)}\n`, 'utf8');
  }
}
