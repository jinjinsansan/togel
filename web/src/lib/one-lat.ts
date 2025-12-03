type OneLatConfig = {
  apiKey: string;
  apiSecret: string;
  apiBaseUrl: string;
  checkoutBaseUrl: string;
  webhookSecret?: string;
};

const getEnv = (key: string) => {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new Error(`Missing One.lat environment variable: ${key}`);
  }
  return value;
};

const getOptionalEnv = (key: string) => {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
};

let cachedConfig: OneLatConfig | null = null;

export const getOneLatConfig = (): OneLatConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    apiKey: getEnv("ONE_LAT_API_KEY"),
    apiSecret: getEnv("ONE_LAT_API_SECRET"),
    apiBaseUrl: getEnv("ONE_LAT_API_BASE_URL"),
    checkoutBaseUrl: getEnv("ONE_LAT_CHECKOUT_BASE_URL"),
    webhookSecret: getOptionalEnv("ONE_LAT_WEBHOOK_SECRET"),
  };

  return cachedConfig;
};

const request = async <T>(path: string, init: RequestInit & { retry?: boolean } = {}): Promise<T> => {
  const { apiBaseUrl, apiKey, apiSecret } = getOneLatConfig();
  const url = new URL(path, apiBaseUrl);

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "x-api-secret": apiSecret,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`One.lat request failed (${response.status}): ${errorPayload}`);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
};

export type OneLatCheckoutType = "PAYMENT" | "SUBSCRIPTION";

export type CreateCheckoutPreferencePayload = {
  type: OneLatCheckoutType;
  amount?: number;
  currency?: string;
  title: string;
  origin?: string;
  external_id?: string;
  expiration_date?: string;
  payer?: {
    email?: string;
    name?: string;
    last_name?: string;
    phone?: string;
  };
  payment_method_types?: string[];
  selected_payment_method_id?: string;
  custom_urls?: {
    status_changes_webhook?: string;
    success_payment_redirect?: string;
    error_payment_redirect?: string;
  };
  payment_link_id?: string;
};

type CheckoutPreferenceResponse = {
  id: string;
  checkout_url: string;
  amount: number;
  currency: string;
};

export const createCheckoutPreference = async (payload: CreateCheckoutPreferencePayload) =>
  request<CheckoutPreferenceResponse>("/v1/checkout_preferences", {
    method: "POST",
    body: JSON.stringify({
      origin: "API",
      ...payload,
    }),
  });

export type PaymentOrderStatus = "OPENED" | "CLOSED" | "REJECTED" | "EXPIRED" | "REFUNDED";

export type PaymentOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  title: string;
  external_id?: string;
  created_at: string;
  updated_at: string;
  payment_method_type: string;
};

export const getPaymentOrder = async (paymentOrderId: string) =>
  request<PaymentOrderResponse>(`/v1/payment_orders/${paymentOrderId}`, {
    method: "GET",
  });

export const verifyWebhookSecret = (token?: string | null) => {
  const { webhookSecret } = getOneLatConfig();
  if (!webhookSecret) {
    return true;
  }
  return token === webhookSecret;
};
