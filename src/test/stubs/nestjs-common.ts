export class BadRequestException extends Error {
  private readonly responsePayload: unknown;

  constructor(response?: string | Record<string, unknown>) {
    super(typeof response === 'string' ? response : JSON.stringify(response));
    this.name = 'BadRequestException';
    this.responsePayload = response;
  }

  getResponse(): unknown {
    return this.responsePayload;
  }
}
