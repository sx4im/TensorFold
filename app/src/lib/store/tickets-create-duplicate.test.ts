import assert from 'node:assert/strict'
import type { Settings, Ticket } from '../types'

const globals = globalThis as any
globals.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
globals.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
globals.addEventListener = () => {}; globals.removeEventListener = () => {}; globals.window = globals
await (await import('../browser-demo-bootstrap')).prepareBrowserDemo()
const { api } = await import('../ipc')
const { useStore } = await import('./index')

const settings: Settings = await api.getSettings()
for (const name of ['onAgentEvent', 'onProjectUpdate', 'onThreadUpdate', 'onRoomUpdate', 'onRoomEvent', 'onJobUpdate', 'onAutomationUpdate', 'onOpenThread', 'onWhatsAppStatus', 'onPersistenceFailure', 'onSshStatus', 'onSshSecretPrompt', 'onSshTrustPrompt', 'onTerminalSessions', 'onTerminalStatus']) (api as any)[name] = () => () => {}
let ticketListener: ((t: Ticket) => void) | undefined
api.onTicketUpdate = (callback) => { ticketListener = callback; return () => {} }
api.onUpdateStatus = () => () => {}
api.getThreads = async () => []; api.getProjects = async () => []; api.getRooms = async () => []
api.getTickets = async () => []; api.getJobs = async () => []; api.getAutomations = async () => []
api.getUpdateStatus = async () => ({ state: 'not_checked', currentVersion: '1.0.0', latestVersion: null, releaseName: null, releaseNotes: null, downloadUrl: null, checksum: null, signature: null, signatureVerified: false, integrity: 'not_checked', feedUrl: 'https://example.com/update.json', checkedAt: null, error: null, automaticUpdate: null, automaticInstall: { supported: false, reason: 'Check first.' }, downloadProgress: null } as any)
api.getArchives = async () => ({ projects: [], threads: [], rooms: [], tickets: [] })
api.listSshHosts = async () => []
api.spineReadSince = async () => { throw new Error('Synthetic spine unavailable; no background data.') }
api.getSettings = async () => settings

await useStore.getState().init()
assert.equal(useStore.getState().ready, true)
assert.ok(ticketListener, 'init registers the live ticket-update listener')

function createdTicket(): Ticket {
  return {
    id: 't_3338', projectId: 'p1', title: 'Duplicate me', body: '', type: 'task',
    status: 'todo', priority: 'medium', effort: 'medium', tags: [], parentId: null,
    assignee: null, threadId: null, runState: null, order: 1,
    createdAt: 100, updatedAt: 100,
  }
}

async function createWithEcho(echoFirst: boolean) {
  useStore.setState({ tickets: [] })
  const ticket = createdTicket()
  let releaseCreate!: (value: Ticket) => void
  api.createTicket = () => new Promise<Ticket>((resolve) => { releaseCreate = resolve })
  const pending = useStore.getState().createTicket({ projectId: 'p1', title: 'Duplicate me', type: 'task', status: 'todo' })
  if (echoFirst) ticketListener!(ticket)
  releaseCreate(ticket)
  await pending
  if (!echoFirst) ticketListener!(ticket)
  return useStore.getState().tickets.filter((t) => t.id === 't_3338').length
}

// Main emits `ticket:update` before the `tickets:create` invoke resolves, so the
// live echo lands first and createTicket's own prepend must not add a second copy.
assert.equal(await createWithEcho(true), 1, 'echo-before-resolve shows the ticket once (#3338)')
console.log('PASS echo-before-resolve shows the ticket once (#3338)')
assert.equal(await createWithEcho(false), 1, 'echo-after-resolve shows the ticket once')
console.log('PASS echo-after-resolve shows the ticket once')
console.log('Kanban ticket creation stays deduplicated against the live ticket-update echo.')
