const isProduction = process.env.NODE_ENV === "production";
const debugFlag = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === "true";

const shouldLogDebug = debugFlag || !isProduction;

export const debugLog = (...args: unknown[]) => {
  if (!shouldLogDebug || typeof console === "undefined") return;
  console.log(...args);
};
