/** @deprecated Import from `@/lib/http/body-transport` instead. */
export {
  appendBodyBytes,
  base64ToBytes,
  bytesToBase64,
  contentTypeFromHeaders,
  extractBodyChunk,
  snapshotBodyToBytes,
} from './body-transport'

export { assessBodyDisplay, MAX_BODY_RENDER_BYTES } from './body-display-limits'
export { decodeBytes, parseCharset } from './body-charset'
export {
  bodyPreviewKindLabel,
  listAvailablePreviewKinds,
  resolveBodyPreviewKind,
  type BodyPreviewKind,
} from './body-preview-kind'
export { bodyKindToCodeMirrorLanguage } from './body-codemirror'
