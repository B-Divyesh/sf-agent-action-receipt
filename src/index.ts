import { createHash, generateKeyPairSync, randomUUID, sign, verify } from 'node:crypto';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type ReceiptStatus = 'prepared' | 'succeeded' | 'failed' | 'unresolved';

export interface Signer {
  /** Stable identifier for the verification key, for key rotation and lookup. */
  keyId: string;
  /** PEM-encoded Ed25519 public key included in verification bundles. */
  publicKeyPem: string;
  sign(message: Uint8Array): Uint8Array;
  verify(message: Uint8Array, signature: Uint8Array): boolean;
}

export interface Receipt {
  version: 1;
  id: string;
  actionId: string;
  sequence: number;
  at: string;
  actor: string;
  tool: string;
  authorityHash: string;
  /** Hash of an optional external witness reference or attestation. */
  witnessHash?: string;
  argsHash: string;
  resultHash?: string;
  errorHash?: string;
  status: ReceiptStatus;
  previousHash: string | null;
  hash: string;
  signature: string;
  /** Optional safe view. This is deliberately excluded from the signed preimage. */
  redactions?: { args?: Json; result?: Json };
}

export interface ReceiptStore {
  /** Persist a receipt. Implementations should reject duplicate receipt IDs. */
  append(receipt: Receipt): void | Promise<void>;
  /** Persist a final receipt that could not be appended after a side effect. */
  saveOutbox(item: OutboxItem): void | Promise<void>;
  /** Atomically append an outbox receipt and remove that outbox item. */
  resolveOutbox(item: OutboxItem): void | Promise<void>;
}

export interface ReceiptLedgerState {
  receipts: Receipt[];
  unresolvedOutbox: OutboxItem[];
}

/** A durable ReceiptStore that can restore a ledger after process restart. */
export interface RecoverableReceiptStore extends ReceiptStore {
  load(): ReceiptLedgerState | Promise<ReceiptLedgerState>;
}

export interface ExecuteOptions<Args extends Json, Result extends Json> {
  tool: string;
  authority: Json;
  /** A reference or attestation from an external witness; only its hash is retained. */
  externalWitness?: Json;
  args: Args;
  /** Optional safe view included in export bundles; raw values are never stored. */
  redact?: (args: Args) => Json;
  redactResult?: (result: Result) => Json;
  run: () => Result | Promise<Result>;
}

export interface OutboxItem {
  receipt: Receipt;
  reason: string;
  createdAt: string;
}

export interface ExecuteResult<Result> {
  result: Result;
  receipt: Receipt;
  /** Present when the side effect completed but final persistence did not. */
  unresolvedOutbox?: OutboxItem;
  /** Optional presentation data that could not be produced; receipt evidence is still complete. */
  redactionWarnings?: readonly string[];
}

export interface ReceiptBundle {
  version: 1;
  exportedAt: string;
  publicKeyPem: string;
  keyId: string;
  receipts: Receipt[];
  unresolvedOutbox: OutboxItem[];
}

export interface VerificationResult {
  ok: boolean;
  checked: number;
  error?: string;
}

export class ToolExecutionError extends Error {
  readonly receipt: Receipt;
  readonly unresolvedOutbox?: OutboxItem;
  /** Set only when neither the final receipt nor its outbox item could be persisted. */
  readonly finalizationError?: OutboxPersistenceError;

  constructor(cause: unknown, receipt: Receipt, unresolvedOutbox?: OutboxItem, finalizationError?: OutboxPersistenceError) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'ToolExecutionError';
    this.cause = cause;
    this.receipt = receipt;
    this.unresolvedOutbox = unresolvedOutbox;
    this.finalizationError = finalizationError;
  }
}

/**
 * A side effect completed, but both final receipt persistence and durable outbox
 * persistence failed. Operators must reconcile this receipt with their store.
 */
export class OutboxPersistenceError extends Error {
  readonly receipt: Receipt;
  readonly finalWriteError: unknown;
  readonly outboxWriteError: unknown;

  constructor(receipt: Receipt, finalWriteError: unknown, outboxWriteError: unknown) {
    super('Final receipt and durable outbox persistence both failed');
    this.name = 'OutboxPersistenceError';
    this.receipt = receipt;
    this.finalWriteError = finalWriteError;
    this.outboxWriteError = outboxWriteError;
  }
}

/**
 * The tool returned or threw, but its exact outcome could not be signed. The
 * attached pre-signed unresolved receipt is either in the chain, in the durable
 * outbox, or available for operator reconciliation through `persistenceError`.
 */
export class ReceiptFinalizationError extends Error {
  readonly receipt: Receipt;
  readonly unresolvedOutbox?: OutboxItem;
  readonly actionError?: unknown;
  readonly persistenceError?: OutboxPersistenceError;

  constructor(cause: unknown, receipt: Receipt, options: {
    unresolvedOutbox?: OutboxItem;
    actionError?: unknown;
    persistenceError?: OutboxPersistenceError;
  } = {}) {
    super(`Action outcome could not be finalized: ${errorMessage(cause)}`);
    this.name = 'ReceiptFinalizationError';
    this.cause = cause;
    this.receipt = receipt;
    this.unresolvedOutbox = options.unresolvedOutbox;
    this.actionError = options.actionError;
    this.persistenceError = options.persistenceError;
  }
}

/** Creates an in-memory Ed25519 signer. Export the key through your OS/KMS, not this package. */
export async function createEd25519Signer(keyId = `ed25519:${randomUUID()}`): Promise<Signer> {
  const keys = generateKeyPairSync('ed25519');
  const publicKeyPem = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  return {
    keyId,
    publicKeyPem,
    sign: (message) => sign(null, message, keys.privateKey),
    verify: (message, signature) => verify(null, message, keys.publicKey, signature)
  };
}

/** Deterministic JSON encoding used for hashes; object key order cannot change an action digest. */
export function canonicalJson(value: Json): string {
  if (value === null || typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Only finite numbers are receipt values');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key]!)}`).join(',')}}`;
}

export function sha256(value: Json | string): string {
  const source = typeof value === 'string' ? value : canonicalJson(value);
  return createHash('sha256').update(source).digest('hex');
}

type UnsignedReceipt = Omit<Receipt, 'hash' | 'signature'>;
function receiptDigest(receipt: UnsignedReceipt): string {
  // Redactions are presentation data: callers can omit them from an export
  // without invalidating the signed, privacy-minimizing evidence record.
  const { redactions: _redactions, ...signed } = receipt;
  return sha256(signed as unknown as Json);
}

function signReceipt(unsigned: UnsignedReceipt, signer: Signer): Receipt {
  const hash = receiptDigest(unsigned);
  const signature = Buffer.from(signer.sign(Buffer.from(hash, 'utf8'))).toString('base64');
  return { ...unsigned, hash, signature };
}

function verifyReceipt(receipt: Receipt, publicKeyPem: string): string | undefined {
  const { hash, signature, ...unsigned } = receipt;
  if (receiptDigest(unsigned) !== hash) return `receipt ${receipt.sequence}: digest mismatch`;
  const signatureOk = verify(null, Buffer.from(hash, 'utf8'), publicKeyPem, Buffer.from(signature, 'base64'));
  if (!signatureOk) return `receipt ${receipt.sequence}: signature mismatch`;
  return undefined;
}

export class ReceiptLedger {
  private readonly signer: Signer;
  private readonly actor: string;
  private readonly store?: ReceiptStore;
  private receipts: Receipt[] = [];
  private outbox: OutboxItem[] = [];
  private queue: Promise<void> = Promise.resolve();

  constructor(options: { signer: Signer; actor: string; store?: ReceiptStore }) {
    if (!options.actor.trim()) throw new TypeError('actor is required');
    this.signer = options.signer;
    this.actor = options.actor;
    this.store = options.store;
  }

  get unresolved(): readonly OutboxItem[] { return this.outbox; }
  get entries(): readonly Receipt[] { return this.receipts; }

  async execute<Args extends Json, Result extends Json>(options: ExecuteOptions<Args, Result>): Promise<ExecuteResult<Result>> {
    return this.serialize(() => this.executeInOrder(options));
  }

  /** Restore a ledger from a durable store before accepting any new actions. */
  static async restore(options: { signer: Signer; actor: string; store: RecoverableReceiptStore }): Promise<ReceiptLedger> {
    const ledger = new ReceiptLedger(options);
    const state = await options.store.load();
    const verification = verifyBundle({
      version: 1,
      exportedAt: new Date().toISOString(),
      publicKeyPem: options.signer.publicKeyPem,
      keyId: options.signer.keyId,
      receipts: state.receipts,
      unresolvedOutbox: state.unresolvedOutbox
    });
    if (!verification.ok) throw new TypeError(`Cannot restore invalid receipt ledger: ${verification.error}`);
    ledger.receipts = [...state.receipts];
    ledger.outbox = [...state.unresolvedOutbox];
    return ledger;
  }

  private async executeInOrder<Args extends Json, Result extends Json>(options: ExecuteOptions<Args, Result>): Promise<ExecuteResult<Result>> {
    if (this.outbox.length) throw new Error('Cannot execute while final receipt outbox is unresolved; drainOutbox first');
    if (!options.tool.trim()) throw new TypeError('tool is required');
    let redactedArgs: Json | undefined;
    if (options.redact) {
      try {
        redactedArgs = validateRedaction(options.redact(options.args));
      } catch (cause) {
        throw new TypeError(`Argument redaction failed before tool execution: ${errorMessage(cause)}`, { cause });
      }
    }
    const actionId = randomUUID();
    const base = {
      actionId,
      tool: options.tool,
      authorityHash: sha256(options.authority),
      argsHash: sha256(options.args),
      ...(options.externalWitness === undefined ? {} : { witnessHash: sha256(options.externalWitness) })
    };
    const prepared = this.makeReceipt({ ...base, status: 'prepared' });
    // This is signed before the tool runs. If exact result finalization later
    // fails, it can still make the action explicit without another KMS call.
    const unresolvedFallback = this.makeReceiptAfter(prepared, {
      ...base,
      status: 'unresolved',
      errorHash: sha256({ name: 'ReceiptFinalizationError', message: 'The action outcome could not be finalized' })
    });
    await this.persistFinal(prepared);

    let result: Result;
    try {
      result = await options.run();
    } catch (cause) {
      let finalReceipt: Receipt;
      try {
        finalReceipt = this.makeReceipt({ ...base, status: 'failed', errorHash: sha256(errorView(cause)) });
      } catch (finalizationCause) {
        return this.recoverFinalization(unresolvedFallback, finalizationCause, cause);
      }
      try {
        const unresolvedOutbox = await this.tryPersistFinal(finalReceipt);
        throw new ToolExecutionError(cause, finalReceipt, unresolvedOutbox);
      } catch (finalizationError) {
        if (finalizationError instanceof ToolExecutionError) throw finalizationError;
        if (finalizationError instanceof OutboxPersistenceError) {
          throw new ToolExecutionError(cause, finalReceipt, undefined, finalizationError);
        }
        throw finalizationError;
      }
    }

    let resultHash: string;
    try {
      resultHash = sha256(result);
    } catch (cause) {
      return this.recoverFinalization(unresolvedFallback, cause);
    }

    const redactionWarnings: string[] = [];
    let redactedResult: Json | undefined;
    if (options.redactResult) {
      try {
        redactedResult = validateRedaction(options.redactResult(result));
      } catch (cause) {
        redactionWarnings.push(`Result redaction was omitted: ${errorMessage(cause)}`);
      }
    }

    let finalReceipt: Receipt;
    try {
      finalReceipt = this.makeReceipt({
        ...base,
        status: 'succeeded',
        resultHash,
        redactions: safeRedactions(redactedArgs, redactedResult)
      });
    } catch (cause) {
      return this.recoverFinalization(unresolvedFallback, cause);
    }
    const unresolvedOutbox = await this.tryPersistFinal(finalReceipt);
    return {
      result,
      receipt: finalReceipt,
      ...(unresolvedOutbox ? { unresolvedOutbox } : {}),
      ...(redactionWarnings.length ? { redactionWarnings } : {})
    };
  }

  async drainOutbox(): Promise<number> {
    return this.serialize(() => this.drainOutboxInOrder());
  }

  private async drainOutboxInOrder(): Promise<number> {
    let drained = 0;
    while (this.outbox.length) {
      const item = this.outbox[0]!;
      try {
        if (this.store) await this.store.resolveOutbox(item);
        this.receipts.push(item.receipt);
        this.outbox.shift();
        drained++;
      } catch {
        break;
      }
    }
    return drained;
  }

  verify(): VerificationResult {
    return verifyBundle(this.exportBundle());
  }

  exportBundle(options: { includeRedactions?: boolean } = {}): ReceiptBundle {
    const strip = (receipt: Receipt): Receipt => {
      if (options.includeRedactions) return receipt;
      const { redactions: _redactions, ...safe } = receipt;
      return safe;
    };
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      publicKeyPem: this.signer.publicKeyPem,
      keyId: this.signer.keyId,
      receipts: this.receipts.map(strip),
      unresolvedOutbox: this.outbox.map((item) => ({ ...item, receipt: strip(item.receipt) }))
    };
  }

  private makeReceipt(fields: Omit<UnsignedReceipt, 'version' | 'id' | 'sequence' | 'at' | 'actor' | 'previousHash'>): Receipt {
    const previous = this.receipts[this.receipts.length - 1];
    return this.makeReceiptAfter(previous, fields);
  }

  private makeReceiptAfter(previous: Receipt | undefined, fields: Omit<UnsignedReceipt, 'version' | 'id' | 'sequence' | 'at' | 'actor' | 'previousHash'>): Receipt {
    return signReceipt({
      version: 1,
      id: randomUUID(),
      sequence: (previous?.sequence ?? 0) + 1,
      at: new Date().toISOString(),
      actor: this.actor,
      previousHash: previous?.hash ?? null,
      ...fields
    }, this.signer);
  }

  private async persistFinal(receipt: Receipt): Promise<void> {
    await this.store?.append(receipt);
    this.receipts.push(receipt);
  }

  private async tryPersistFinal(receipt: Receipt): Promise<OutboxItem | undefined> {
    try {
      await this.persistFinal(receipt);
      return undefined;
    } catch (finalWriteError) {
      return this.persistOutbox(receipt, errorMessage(finalWriteError), finalWriteError);
    }
  }

  private async recoverFinalization(fallback: Receipt, cause: unknown, actionError?: unknown): Promise<never> {
    try {
      await this.persistFinal(fallback);
    } catch (finalWriteError) {
      try {
        const unresolvedOutbox = await this.persistOutbox(
          fallback,
          `Outcome finalization failed (${errorMessage(cause)}); final receipt write failed (${errorMessage(finalWriteError)})`,
          finalWriteError
        );
        throw new ReceiptFinalizationError(cause, fallback, { unresolvedOutbox, actionError });
      } catch (outboxWriteError) {
        if (outboxWriteError instanceof ReceiptFinalizationError) throw outboxWriteError;
        const persistenceError = outboxWriteError instanceof OutboxPersistenceError
          ? outboxWriteError
          : new OutboxPersistenceError(fallback, finalWriteError, outboxWriteError);
        throw new ReceiptFinalizationError(cause, fallback, { actionError, persistenceError });
      }
    }
    throw new ReceiptFinalizationError(cause, fallback, { actionError });
  }

  private async persistOutbox(receipt: Receipt, reason: string, finalWriteError: unknown): Promise<OutboxItem> {
    const item = { receipt, reason, createdAt: new Date().toISOString() };
    try {
      if (this.store) await this.store.saveOutbox(item);
    } catch (outboxWriteError) {
        throw new OutboxPersistenceError(receipt, finalWriteError, outboxWriteError);
    }
    this.outbox.push(item);
    return item;
  }

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }
}

export function createReceiptLedger(options: ConstructorParameters<typeof ReceiptLedger>[0]): ReceiptLedger {
  return new ReceiptLedger(options);
}

/** Verifies hashes, Ed25519 signatures, sequence ordering, and any explicit unresolved outbox receipt. */
export function verifyBundle(bundle: ReceiptBundle): VerificationResult {
  if (bundle.version !== 1) return { ok: false, checked: 0, error: 'Unsupported bundle version' };
  let previousHash: string | null = null;
  let expectedSequence = 1;
  const check = (receipt: Receipt): string | undefined => {
    if (receipt.sequence !== expectedSequence++) return `receipt ${receipt.sequence}: sequence is not contiguous`;
    if (receipt.previousHash !== previousHash) return `receipt ${receipt.sequence}: previous hash mismatch`;
    const failure = verifyReceipt(receipt, bundle.publicKeyPem);
    if (failure) return failure;
    previousHash = receipt.hash;
    return undefined;
  };
  for (const receipt of bundle.receipts) {
    const failure = check(receipt);
    if (failure) return { ok: false, checked: expectedSequence - 1, error: failure };
  }
  for (const item of bundle.unresolvedOutbox) {
    const failure = check(item.receipt);
    if (failure) return { ok: false, checked: expectedSequence - 1, error: `outbox ${failure}` };
  }
  return { ok: true, checked: expectedSequence - 1 };
}

function safeRedactions(args?: Json, result?: Json): { args?: Json; result?: Json } | undefined {
  const redactions = { ...(args === undefined ? {} : { args }), ...(result === undefined ? {} : { result }) };
  return Object.keys(redactions).length ? redactions : undefined;
}

function validateRedaction(value: Json | undefined): Json | undefined {
  if (value !== undefined) canonicalJson(value);
  return value;
}

function errorView(error: unknown): Json {
  return { name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : String(error) };
}

function errorMessage(error: unknown): string {
  try {
    return error instanceof Error ? error.message : String(error);
  } catch {
    return 'unknown error';
  }
}
