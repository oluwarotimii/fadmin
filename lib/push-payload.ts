export type AwoofAction =
  | { actionType: "open_feed" }
  | { actionType: "open_cart"; replaceCart?: boolean; items?: Array<{ productId: number; quantity: number }> }
  | { actionType: "checkout"; replaceCart?: boolean; items?: Array<{ productId: number; quantity: number }> }
  | { actionType: "checkout_product"; productId: number }

export type PushDataPayload = {
  notificationId?: string | number
  deepLinkType?: string | null
  deepLinkValue?: string | null
  linkType?: string
  linkValue?: string
  awoofAction?: AwoofAction
}

type PageDeepLinkValue = {
  page?: string
  linkValue?: string
  awoofAction?: AwoofAction
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * Backwards-compatible payload builder.
 *
 * Existing app versions may still read deepLinkType/deepLinkValue.
 * New app versions can read linkType/linkValue and page-specific action objects.
 */
export function buildExpoDataPayload(args: {
  notificationId?: string | number
  deepLinkType?: string | null
  deepLinkValue?: string | null
}): PushDataPayload {
  const { notificationId, deepLinkType, deepLinkValue } = args
  const payload: PushDataPayload = {
    notificationId,
    deepLinkType: deepLinkType ?? null,
    deepLinkValue: deepLinkValue ?? null,
  }

  if (deepLinkType === "page") {
    // For "page", we support deepLinkValue as either:
    // - a plain page slug (e.g. "awoof")
    // - a JSON string like: {"page":"awoof","awoofAction":{...}}
    const parsed = typeof deepLinkValue === "string" ? safeJsonParse<PageDeepLinkValue>(deepLinkValue) : null
    const page = parsed?.page || parsed?.linkValue || deepLinkValue || ""

    payload.linkType = "page"
    payload.linkValue = page

    if (parsed?.awoofAction) {
      payload.awoofAction = parsed.awoofAction
    }
  }

  return payload
}

