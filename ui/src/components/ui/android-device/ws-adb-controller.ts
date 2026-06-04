import { fetchBaseAddresses } from '@/lib/http/settings-api'
import { WsOp } from '@/lib/generated/ws/v1'
import type { useWsConnectionStore } from '@/stores/modules/ws-connection.store'
import type { AdbController } from './adb-controller'
import type {
  AdbDevice,
  AdbStatus,
  InstallProgress,
  ProxyState,
} from './types'

type WsStore = ReturnType<typeof useWsConnectionStore>

interface DevicesListResponse {
  devices: AdbDevice[]
}

export function createWsAdbController(ws: WsStore): AdbController {
  return {
    async getStatus() {
      return ws.call<AdbStatus>(WsOp.DeviceAdbStatusGet)
    },
    async install() {
      return ws.call<AdbStatus>(WsOp.DeviceAdbInstall)
    },
    async getInstallProgress() {
      return ws.call<InstallProgress>(WsOp.DeviceAdbInstallProgressGet)
    },
    async listDevices() {
      const result = await ws.call<DevicesListResponse>(WsOp.DeviceAdbDevicesList)
      return result?.devices ?? []
    },
    async getProxyState(serial) {
      return ws.call<ProxyState>(WsOp.DeviceAdbProxyStateGet, { serial })
    },
    async enableProxy(payload) {
      return ws.call<ProxyState>(WsOp.DeviceAdbProxyEnable, { ...payload })
    },
    async disableProxy(serial) {
      return ws.call<ProxyState>(WsOp.DeviceAdbProxyDisable, { serial })
    },
    async getBaseAddresses() {
      return fetchBaseAddresses()
    },
    async getLocalOnly() {
      const addrs = await fetchBaseAddresses()
      return addrs.every((addr) => {
        const host = addr.includes('://') ? addr.split('://')[1] : addr
        const ip = host?.split(':')[0] ?? ''
        return ip === '127.0.0.1' || ip === 'localhost'
      })
    },
  }
}
