import type {
  AdbDevice,
  AdbStatus,
  EnableProxyPayload,
  InstallProgress,
  ProxyState,
} from './types'

export interface AdbController {
  getStatus(): Promise<AdbStatus>
  install(): Promise<AdbStatus>
  getInstallProgress(): Promise<InstallProgress>
  listDevices(): Promise<AdbDevice[]>
  getProxyState(serial: string): Promise<ProxyState>
  enableProxy(payload: EnableProxyPayload): Promise<ProxyState>
  disableProxy(serial: string): Promise<ProxyState>
  getBaseAddresses(): Promise<string[]>
  getLocalOnly(): Promise<boolean>
}
