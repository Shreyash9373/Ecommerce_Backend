class ApiError extends Error {
  constructor(
    status,
    message = "Something went wrong",
    error = [],
    stack = ""
  ) {
    super(message);
    this.status = status;
    this.message = message;
    this.data = null;
    this.success = false;
    this.error = error;
    if (stack) {
      this.stack = stack;
      console.log(stack);
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
