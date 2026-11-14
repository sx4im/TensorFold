// Run: jiti src/lib/store/slices/ticketsSlice.test.ts
// Regression for #3338: creating a Kanban entry shows two identical boxes in
// 'Todo' until restart. Main's `tickets:create` persists the ticket and emits
// `ticket:update` BEFORE the invoke resolves, so the live broadcast lands (via
// applyTicketUpdate) first and createTicket's unconditional prepend adds the
// same id a second time. Only one copy survives a restart because the store
// persists the ticket once.
import assert from 'node:assert/strict'

// Minimal browser shims so ./ipc and ./store (which read window/localStorage/
// matchMedia at module load) can be imported under plain node. window has no
// `vontra`, so ./ipc falls back to the mock api; we override its methods below.
const g = globalThis as Record<string, unknown>
g.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
g.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
g.addEventListener = () => {}
g.removeEventListener = () => {}
g.window = g

// Loaded after the shims so module-init-time reads succeed.
await (await import('../../browser-demo-bootstrap')).prepareBrowserDemo()
const { api } = await import('../../ipc.ts')
const { useStore } = await import('../../store.ts')

let passed = 0
const ok = (name: string) => { passed++; console.log(`  ✓ ${name}`) }

console.log('ticketsSlice createTicket tests:')

const ticket = {
  id: 'ticket-1',
  projectId: 'project-1',
  title: 'Do the thing',
  body: '',
  type: 'task',
  status: 'todo',
  priority: 'medium',
  effort: 'medium',
  tags: [],
  order: 1,
  createdAt: 1,
  updatedAt: 1,
} as any

// The create IPC call resolves with the same ticket the broadcast delivered.
api.createTicket = (async () => ticket) as typeof api.createTicket

await (async () => {
  useStore.setState({ tickets: [] })
  // Simulate the live `ticket:update` broadcast arriving before the invoke resolves.
  useStore.getState().applyTicketUpdate(ticket)
  assert.equal(useStore.getState().tickets.length, 1, 'precondition: broadcast added the ticket once')
  await useStore.getState().createTicket({ projectId: 'project-1', title: 'Do the thing', type: 'task', priority: 'medium', effort: 'medium', status: 'todo' })
  const copies = useStore.getState().tickets.filter((t) => t.id === 'ticket-1')
  assert.equal(copies.length, 1, 'createTicket must not duplicate a ticket the live broadcast already added (#3338)')
  ok('createTicket dedupes a ticket already added by the ticket:update broadcast')
})()

await (async () => {
  useStore.setState({ tickets: [] })
  await useStore.getState().createTicket({ projectId: 'project-1', title: 'Do the thing', type: 'task', priority: 'medium', effort: 'medium', status: 'todo' })
  assert.equal(useStore.getState().tickets.length, 1, 'plain create adds exactly one ticket')
  ok('createTicket adds exactly one ticket when no broadcast arrived')
})()

console.log(`\n${passed} passed`)
