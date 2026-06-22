/**
 * Uniform result and error contract for deterministic runtime operations.
 *
 * Every public runtime operation (see docs/deterministic-runtime.md section 7)
 * returns a {@link RuntimeResult}. Section 8 requires operations to report which
 * paths were created, already existed, were updated, or skipped, and to fail with
 * a structured repair hint rather than a bare throw.
 */

/** Filesystem paths touched by an operation, grouped by disposition (section 8). */
export interface RuntimePaths {
  readonly created: readonly string[];
  readonly existing: readonly string[];
  readonly updated: readonly string[];
  readonly skipped: readonly string[];
}

/**
 * Structured failure detail. Field shape intentionally mirrors the validator's
 * `ValidationIssue` (tools/validate/src/types.ts) so callers can treat runtime
 * and validation problems uniformly.
 */
export interface RuntimeError {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly hint?: string;
}

export interface RuntimeSuccess<TData> {
  readonly ok: true;
  readonly data: TData;
  readonly paths: RuntimePaths;
  readonly warnings: readonly string[];
}

export interface RuntimeFailure {
  readonly ok: false;
  readonly error: RuntimeError;
}

export type RuntimeResult<TData> = RuntimeSuccess<TData> | RuntimeFailure;

/** Empty path-disposition record. */
export function emptyRuntimePaths(): RuntimePaths {
  return { created: [], existing: [], updated: [], skipped: [] };
}

/** Combine multiple path-disposition records into one (order-preserving). */
export function mergeRuntimePaths(...parts: readonly RuntimePaths[]): RuntimePaths {
  return {
    created: parts.flatMap((part) => part.created),
    existing: parts.flatMap((part) => part.existing),
    updated: parts.flatMap((part) => part.updated),
    skipped: parts.flatMap((part) => part.skipped),
  };
}

/**
 * Build a {@link RuntimeError}. Optional fields are only set when provided so the
 * object stays compatible with `exactOptionalPropertyTypes`.
 */
export function runtimeError(
  code: string,
  message: string,
  options: { path?: string; hint?: string } = {},
): RuntimeError {
  return {
    code,
    message,
    ...(options.path !== undefined ? { path: options.path } : {}),
    ...(options.hint !== undefined ? { hint: options.hint } : {}),
  };
}

export interface RuntimeOkOptions {
  paths?: RuntimePaths;
  warnings?: readonly string[];
}

/** Construct a successful result. */
export function runtimeOk<TData>(data: TData, options: RuntimeOkOptions = {}): RuntimeSuccess<TData> {
  return {
    ok: true,
    data,
    paths: options.paths ?? emptyRuntimePaths(),
    warnings: options.warnings ?? [],
  };
}

/** Construct a failed result. */
export function runtimeFail(error: RuntimeError): RuntimeFailure {
  return { ok: false, error };
}

/**
 * Throwable carrier for an aborting runtime condition. Internal helpers (for
 * example JSON readers) throw this; operation wrappers convert it into a
 * {@link RuntimeFailure} so the public surface only ever returns a RuntimeResult.
 */
export class RuntimeAbortError extends Error {
  readonly detail: RuntimeError;

  constructor(detail: RuntimeError) {
    super(detail.message);
    this.name = "RuntimeAbortError";
    this.detail = detail;
  }
}

/**
 * Run an operation body and normalize a thrown {@link RuntimeAbortError} into a
 * {@link RuntimeFailure}. Other errors propagate unchanged (they are bugs, not
 * recoverable runtime conditions).
 */
export async function runRuntimeOperation<TData>(
  body: () => Promise<RuntimeResult<TData>>,
): Promise<RuntimeResult<TData>> {
  try {
    return await body();
  } catch (error) {
    if (error instanceof RuntimeAbortError) {
      return runtimeFail(error.detail);
    }
    throw error;
  }
}
