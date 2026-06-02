/** Max bytes kept in the stream store per body. */
export const MAX_BODY_STORE_BYTES = 2 * 1024 * 1024

/** Max bytes rendered in the UI (decode / hex / CodeMirror). */
export const MAX_BODY_RENDER_BYTES = 2 * 1024 * 1024

export type BodyDisplayAssessment =
  | { renderable: true; byteLength: number }
  | { renderable: false; byteLength: number; limit: number }

/** Byte length for display gates without holding the full buffer (e.g. Storybook demos). */
export function resolveBodyByteLength(
  bytes?: Uint8Array,
  reportedByteLength?: number,
): number {
  if (reportedByteLength != null && reportedByteLength >= 0) {
    return reportedByteLength
  }

  return bytes?.length ?? 0
}

export function assessBodyDisplay(
  bytes?: Uint8Array,
  reportedByteLength?: number,
): BodyDisplayAssessment {
  const byteLength = resolveBodyByteLength(bytes, reportedByteLength)

  if (byteLength === 0) {
    return { renderable: true, byteLength: 0 }
  }

  if (byteLength > MAX_BODY_RENDER_BYTES) {
    return {
      renderable: false,
      byteLength,
      limit: MAX_BODY_RENDER_BYTES,
    }
  }

  return { renderable: true, byteLength }
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function bodyTooLargeMessage(byteLength: number, limit = MAX_BODY_RENDER_BYTES): string {
  return `内容过大（约 ${formatByteSize(byteLength)}，超过 ${formatByteSize(limit)}），已跳过展示以避免浏览器卡顿`
}

export function bodyTooLargeHint(limit = MAX_BODY_RENDER_BYTES): string {
  return `仅支持预览 ≤ ${formatByteSize(limit)} 的 Body`
}
