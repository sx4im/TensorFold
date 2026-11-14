import assert from 'node:assert/strict'
import { firstLoadedThreadId } from './thread-open'

const threads = [{ id: 'live' }, { id: 'other' }]
assert.equal(firstLoadedThreadId(['live'], threads), 'live', 'a loaded thread resolves')
assert.equal(firstLoadedThreadId(['archived', 'live'], threads), 'live', 'a stale id falls through to the next candidate')
assert.equal(firstLoadedThreadId(['archived'], threads), null, 'an archived thread no longer in the store does not resolve')
assert.equal(firstLoadedThreadId([null, undefined, ''], threads), null, 'empty candidates do not resolve')
assert.equal(firstLoadedThreadId(['live'], []), null, 'no loaded threads means no open target')
assert.equal(firstLoadedThreadId([], threads), null, 'no candidates means no open target')
assert.equal(firstLoadedThreadId(['live', 'other'], threads), 'live', 'the first loaded candidate wins')
console.log('Stale thread ids never open a blank Thread view passed')
