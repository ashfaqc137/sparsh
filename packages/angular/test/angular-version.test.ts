import { VERSION as commonVersion } from '@angular/common'
import { VERSION as compilerVersion } from '@angular/compiler'
import { VERSION as coreVersion } from '@angular/core'
import { VERSION as platformBrowserVersion } from '@angular/platform-browser'
import { describe, expect, it } from 'vitest'

/**
 * Guards the supported floor: the suite must run on Angular 22. If any Angular package silently
 * resolved to a different install, the run would test a mix and prove nothing.
 */
describe('Angular version under test', () => {
  it.each([
    ['@angular/core', coreVersion.major],
    ['@angular/common', commonVersion.major],
    ['@angular/compiler', compilerVersion.major],
    ['@angular/platform-browser', platformBrowserVersion.major],
  ])('%s is Angular 22', (_name, major) => {
    expect(major).toBe('22')
  })
})
