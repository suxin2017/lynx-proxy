import type { NetworkDetailRecord } from '@/components/ui/network-request-detail/types'
import { captureToDraft } from '@/components/ui/compose/lib/capture-to-draft'
import { exportDraftToCurl } from '@/components/ui/compose/lib/export-curl'

/**
 * Export a captured network record into a Chrome-like "Copy as cURL" command.
 *
 * Implementation intentionally reuses the Compose feature pipeline:
 * captured record -> compose draft -> cURL.
 */
export function exportNetworkRecordToCurl(record: NetworkDetailRecord): string {
  return exportDraftToCurl(captureToDraft(record))
}

