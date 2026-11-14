/**
 * Resolve an [Open] target to a thread that is still loaded in the workspace.
 *
 * Threads disappear from the store when they are archived (see applyThreadUpdate
 * in the threads slice: an archived thread is filtered out of `threads`, and only
 * the currently open view is reset to home), while tickets and durable jobs keep
 * pointing at the old id. Opening such a stale id sets a thread view the Thread
 * component cannot render, so it returns null and the window stays blank under
 * the "Thread" title. Callers must only open an id this returns, and fall back
 * (room, automation, Work) otherwise.
 */
export function firstLoadedThreadId(
  candidates: readonly (string | null | undefined)[],
  threads: readonly { id: string }[],
): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue
    if (threads.some((thread) => thread.id === candidate)) return candidate
  }
  return null
}
