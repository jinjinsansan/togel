const getLineEnvVar = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing LINE environment variable: ${key}`);
  }
  return value;
};

export const lineEnv = {
  channelSecret: getLineEnvVar("LINE_CHANNEL_SECRET"),
  channelAccessToken: getLineEnvVar("LINE_CHANNEL_ACCESS_TOKEN"),
};

export const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
