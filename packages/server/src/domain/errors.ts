export class AppError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number,
    readonly retryable = false
  ) { super(code); }
}
