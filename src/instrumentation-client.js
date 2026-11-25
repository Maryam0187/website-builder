// React's development Server Component profiler calls performance.measure with a
// negative end time when a server component redirects or its render is aborted.
// Chromium throws, and Next.js surfaces that as a runtime error named after the
// component (for example AdminHomePage). Skip only that case.
function isDevProfilerTimestampError(error) {
  if (!(error instanceof TypeError) || typeof error.message !== "string") return false;
  return /negative time ?stamp/i.test(error.message) || /non-finite/i.test(error.message);
}

if (
  process.env.NODE_ENV === "development" &&
  typeof performance !== "undefined" &&
  typeof performance.measure === "function"
) {
  const measure = performance.measure.bind(performance);
  performance.measure = function measureWithoutNegativeTimestamp(name, startOrOptions, endMark) {
    try {
      return measure(name, startOrOptions, endMark);
    } catch (error) {
      if (isDevProfilerTimestampError(error)) return undefined;
      throw error;
    }
  };
}
