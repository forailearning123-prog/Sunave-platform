export function ok(data = {}, meta = {}) {
  return {
    success: true,
    data,
    meta
  };
}

export function fail(code, message, details) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  };
}
