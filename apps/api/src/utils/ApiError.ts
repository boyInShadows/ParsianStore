// Thrown by controllers/services for expected failure conditions (bad
// input, not found, unauthorized, etc.). The error middleware trusts
// `message` from an ApiError to be safe to send to the client; anything
// else is an unexpected bug and gets a generic message instead (see
// middleware/error.ts).
export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}
