import { describe, expect, it } from 'vitest'
import { parseCurlCommand, parsedCurlToDraft } from './parse-curl'
import { parseUrlParams } from './parse-url-params'

describe('parseCurlCommand', () => {
  it('parses --location and splits URL query into params', () => {
    const cmd = `curl --location 'https://example.com/api?sig=abc&client_key=3c2cd3f3' -H 'content-type: application/json' --data '{"ok":true}'`
    const parsed = parseCurlCommand(cmd)
    expect(parsed.followRedirects).toBe(true)
    expect(parsed.method).toBe('POST')
    expect(parsed.body).toBe('{"ok":true}')

    const draft = parsedCurlToDraft(parsed)
    expect(draft.url).toBe('https://example.com/api?sig=abc&client_key=3c2cd3f3')
    expect(draft.queryParams).toEqual(parseUrlParams(draft.url))
  })
})
