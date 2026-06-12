import { computed } from 'vue'
import {
  selectedCode,
  selectedDescription,
  selectedShortCode,
} from './use-selection-helpers.js'

const MATERIAL_SEQUENCE = '0001'

/** Deepest tier first — the most specific selection drives the material number. */
const HIERARCHY_CHAIN = ['subClass', 'class', 'model', 'series']

export function useMaterialCodeGenerator(selections, textFields, previewConfig, fields, groups) {
  const codeSegments = computed(() => {
    const prefix = partAssemblyPrefix(selections)
    const body = materialBodyCode(selections)
    const leafFieldId = materialLeafFieldId(selections)
    const leafField = fields.value.find((field) => field.id === leafFieldId)
    const firstSegment = `${prefix || '_'}${body}`
    const filled = Boolean(body)

    return [
      {
        text: firstSegment,
        fieldId: leafFieldId,
        type: 'field',
        filled,
        group: leafField?.group || null,
        label: leafField?.label || 'Material code',
        accentColor: groupAccent(groups, leafField?.group),
      },
      { text: '-', fieldId: null, type: 'separator', filled: true },
      {
        text: MATERIAL_SEQUENCE,
        fieldId: '__materialSequence__',
        type: 'field',
        filled,
        group: null,
        label: 'Sequence',
        accentColor: '#64748b',
      },
    ]
  })

  const generatedCode = computed(() => {
    const prefix = partAssemblyPrefix(selections)
    const body = materialBodyCode(selections)
    if (!body) return ''
    return `${prefix}${body}-${MATERIAL_SEQUENCE}`
  })

  const generatedDescription = computed(() => {
    const parts = previewConfig.value?.descriptionParts?.length
      ? previewConfig.value.descriptionParts
      : HIERARCHY_CHAIN.slice().reverse()

    const pieces = []
    for (const id of parts) {
      const code = selectedCode(selections, id)
      if (!code || /^0+$/.test(code)) continue
      const desc = selectedDescription(selections, id)
      if (desc && desc !== '-') pieces.push(desc)
    }

    const thickness = formatDescription(textFields.thickness)
    if (thickness) pieces.push(thickness)

    return pieces.join(' ').replace(/\s+/g, ' ').trim()
  })

  return {
    codeSegments,
    generatedCode,
    generatedDescription,
  }
}

function formatDescription(raw) {
  const compact = String(raw ?? '').trim().replace(/\s/g, '')
  return compact ? String(compact) : ''
}

/** P/M prefix taken from the series shortCode (e.g. "P/M" → P, "P" → P). */
function partAssemblyPrefix(selections) {
  const shortCode = selectedShortCode(selections, 'series')
  if (shortCode && shortCode !== '-') {
    return shortCode.charAt(0).toUpperCase()
  }
  return ''
}

/** Full code of the deepest meaningful selection (skips the default "00000" subclass). */
function materialBodyCode(selections) {
  for (const id of HIERARCHY_CHAIN) {
    const code = selectedCode(selections, id)
    if (code && !/^0+$/.test(code)) return code
  }
  return ''
}

function materialLeafFieldId(selections) {
  for (const id of HIERARCHY_CHAIN) {
    const code = selectedCode(selections, id)
    if (code && !/^0+$/.test(code)) return id
  }
  return 'subClass'
}

function groupAccent(groups, groupId) {
  const group = groups.value.find((item) => item.id === groupId)
  return group?.accent || '#3b82f6'
}
