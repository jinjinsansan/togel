const envToBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() !== "false" && value !== "0";
};

export const RECOMMENDATIONS_ENABLED = envToBoolean(process.env.NEXT_PUBLIC_RECOMMENDATIONS_ENABLED, true);
export const MICHELLE_AI_ENABLED = envToBoolean(process.env.NEXT_PUBLIC_MICHELLE_AI_ENABLED, false);
