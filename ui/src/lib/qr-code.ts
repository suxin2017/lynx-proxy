import type { QRCodeToDataURLOptions } from 'qrcode'

type QrModule = {
  toDataURL: (
    text: string,
    options?: QRCodeToDataURLOptions,
  ) => Promise<string>
}

async function loadQrModule(): Promise<QrModule> {
  const mod = await import('qrcode')
  const candidate = mod as QrModule & { default?: QrModule }

  if (typeof candidate.toDataURL === 'function') {
    return candidate
  }

  if (candidate.default && typeof candidate.default.toDataURL === 'function') {
    return candidate.default
  }

  throw new Error('qrcode module is missing toDataURL')
}

export async function qrCodeToDataUrl(
  text: string,
  options?: QRCodeToDataURLOptions,
): Promise<string> {
  const qr = await loadQrModule()
  return qr.toDataURL(text, options)
}
