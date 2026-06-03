import { describe, expect, it } from 'vitest'
import {
  proxyForwardChoiceToScheme,
  proxyForwardSchemeFromDto,
  proxyForwardSchemeSummaryLabel,
  proxyForwardSchemeToChoice,
} from './proxy-forward-scheme'

describe('proxy-forward-scheme', () => {
  it('maps stored values to dropdown choices', () => {
    expect(proxyForwardSchemeToChoice('')).toBe('inherit')
    expect(proxyForwardSchemeToChoice('http')).toBe('http')
    expect(proxyForwardSchemeToChoice('ws')).toBe('http')
    expect(proxyForwardSchemeToChoice('https')).toBe('https')
    expect(proxyForwardSchemeToChoice('wss')).toBe('https')
  })

  it('maps choices to persisted scheme', () => {
    expect(proxyForwardChoiceToScheme('inherit')).toBe('')
    expect(proxyForwardChoiceToScheme('http')).toBe('http')
    expect(proxyForwardChoiceToScheme('https')).toBe('https')
  })

  it('normalizes dto values for the workbench', () => {
    expect(proxyForwardSchemeFromDto(undefined)).toBe('')
    expect(proxyForwardSchemeFromDto('wss')).toBe('https')
    expect(proxyForwardSchemeFromDto('ws')).toBe('http')
  })

  it('formats summary labels', () => {
    expect(proxyForwardSchemeSummaryLabel('')).toBe('*')
    expect(proxyForwardSchemeSummaryLabel('http')).toBe('http/ws')
    expect(proxyForwardSchemeSummaryLabel('https')).toBe('https/wss')
  })
})
