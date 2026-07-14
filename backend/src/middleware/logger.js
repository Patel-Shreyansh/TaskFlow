/**
 * Small request logger so every request/response is traceable in
 * the console during development and on a hosting provider's logs.
 */
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const ts = new Date().toISOString();
    console.log(
      `[${ts}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)}ms)`
    );
  });

  next();
}

module.exports = requestLogger;
