export interface AudienceItem {
  id?: string
  label: string
  description?: string | null
}

export interface AudiencePokerActivity {
  id: string
  title: string
  instructions?: { root?: { children?: unknown[] } } | null
  chipBudget: number
  audiences: AudienceItem[]
  isActive?: boolean | null
}

function collectText(node: unknown): string[] {
  if (node && typeof node === 'object') {
    const n = node as Record<string, unknown>
    if ('text' in n && typeof n.text === 'string') return [n.text]
    if ('children' in n && Array.isArray(n.children)) {
      return (n.children as unknown[]).flatMap(collectText)
    }
  }
  return []
}

export function instructionsToText(instructions: AudiencePokerActivity['instructions']): string {
  if (!instructions?.root?.children || !Array.isArray(instructions.root.children)) return ''
  const parts = (instructions.root.children as unknown[]).flatMap(collectText)
  return parts.join(' ').trim()
}
