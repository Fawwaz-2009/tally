import { Data } from "effect";

export class BlobStorageError extends Data.Error<{
  message: string;
}> {}

export class DbError extends Data.Error<{
  message: string;
}> {}

export class NotFoundError extends Data.Error<{
  message: string;
}> {}

export class BadRequestError extends Data.Error<{
  message: string;
}> {}

export class QueueError extends Data.Error<{
  message: string;
}> {}

export class BadAiRequestError extends Data.Error<{
  message: string;
}> {}

export class KVStorageError extends Data.Error<{
  message: string;
}> {}

export class UnexpectedError extends Data.Error<{
  message: string;
}> {}