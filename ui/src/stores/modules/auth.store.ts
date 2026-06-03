import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchAuthStatus, login as loginApi, logout as logoutApi } from '@/lib/auth/api'
import { getAuthToken } from '@/lib/auth/token'

export const useAuthStore = defineStore('auth', () => {
  const enabled = ref(false)
  const authed = ref(true)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  const needsLogin = computed(() => enabled.value && !authed.value)

  async function bootstrap() {
    loading.value = true
    error.value = null
    try {
      const status = await fetchAuthStatus()
      enabled.value = status.enabled
      authed.value = status.enabled ? status.authed : true
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      enabled.value = false
      authed.value = true
    }
    finally {
      loading.value = false
      initialized.value = true
    }
  }

  async function login(username: string, password: string) {
    loading.value = true
    error.value = null
    try {
      await loginApi(username, password)
      authed.value = true
      enabled.value = true
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      authed.value = Boolean(getAuthToken())
      throw err
    }
    finally {
      loading.value = false
    }
  }

  function logout() {
    logoutApi()
    authed.value = false
    error.value = null
  }

  return {
    enabled,
    authed,
    loading,
    error,
    initialized,
    needsLogin,
    bootstrap,
    login,
    logout,
  }
})
