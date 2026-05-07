import { computed, unref } from 'vue'

/** Rev 2 slide 17: voltage → …V, capacity → …Ah (no double suffix). */
function formatManualDescriptionPart(fieldId, raw) {
  const t = String(raw ?? '').trim()
  if (!t) return ''
  const id = String(fieldId ?? '').toLowerCase()
  if (id === 'voltage') {
    const compact = t.replace(/\s/g, '')
    if (/v$/i.test(compact)) {
      return compact.replace(/v$/i, 'V')
    }
    return `${compact}V`
  }
  if (id === 'capacity') {
    const compact = t.replace(/\s/g, '')
    if (/ah$/i.test(compact)) {
      return compact.replace(/ah$/i, 'Ah')
    }
    return `${compact}Ah`
  }
  return t
}

/**
 * Rev 2 product code: {classCode} - {stubMain} - {variant} and description from short codes + manual text.
 */
export function useProductRev2Preview(
  selections,
  textFields,
  variantOrdinalRef,
  previewConfig,
  fields,
  groups,
) {
  const groupAccentMap = computed(() => {
    const map = {}
    for (const g of groups.value) {
      map[g.id] = g.accent || '#3b82f6'
    }
    return map
  })

  const hierarchyComplete = computed(() => {
    return (
      selections.series &&
      selections.model &&
      selections.class &&
      selections.subClass
    )
  })

  /** Cascade order — deepest resolved selection supplies the “live” first segment until the tree is complete. */
  const HIERARCHY_CHAIN = ['series', 'model', 'class', 'subClass']

  function deepestHierarchySelection() {
    let last = null
    for (const id of HIERARCHY_CHAIN) {
      const s = selections[id]
      if (s != null && s !== '') last = s
    }
    return last
  }

  function optionCode(sel) {
    if (sel == null || sel === '') return ''
    if (typeof sel !== 'object') return String(sel)
    const c = sel.code ?? sel.value
    return c != null && c !== '' ? String(c) : ''
  }

  const leafFieldId = computed(
    () => previewConfig.value?.hierarchyLeafCodeField || 'class',
  )

  const variantDigits = computed(
    () => previewConfig.value?.stubVariantCounterDigits ?? 3,
  )

  const mainDigits = computed(
    () => previewConfig.value?.stubMainCounterDigits ?? 3,
  )

  const sep = computed(() => previewConfig.value?.codeSeparator ?? ' - ')

  const paddedMainStub = computed(() =>
    String(1).padStart(mainDigits.value, '0'),
  )

  const paddedVariant = computed(() =>
    String(unref(variantOrdinalRef)).padStart(variantDigits.value, '0'),
  )

  /** First code segment: final leaf when complete; otherwise the deepest selected tier (live preview). */
  const firstSegmentCode = computed(() => {
    if (hierarchyComplete.value) {
      return optionCode(selections[leafFieldId.value]) || ''
    }
    return optionCode(deepestHierarchySelection())
  })

  const generatedCode = computed(() => {
    const separator = sep.value
    const md = mainDigits.value
    const vd = variantDigits.value
    const padUnd = (n) => '_'.repeat(n)

    if (hierarchyComplete.value) {
      const leafCode = optionCode(selections[leafFieldId.value])
      if (!leafCode) {
        return ''
      }
      return [leafCode, paddedMainStub.value, paddedVariant.value].join(separator)
    }

    /** Partial tree — show live first segment with placeholder stub + variant slots */
    const first = firstSegmentCode.value
    if (!first) {
      return ''
    }
    return [first, padUnd(md), padUnd(vd)].join(separator)
  })

  const generatedDescription = computed(() => {
    const useShort = previewConfig.value?.useShortCodeInDescription !== false
    const partsIds = previewConfig.value?.descriptionParts ?? [
      'series',
      'model',
      'class',
    ]

    const pieces = []
    for (const id of partsIds) {
      const sel = selections[id]
      if (!sel) continue
      const token = useShort ? sel.shortCode ?? sel.description : sel.description
      if (token && String(token).trim() && token !== '-') {
        pieces.push(String(token).trim())
      }
    }

    const manualIds = previewConfig.value?.descriptionManualFields ?? []
    const tf = textFields
    for (const id of manualIds) {
      const raw = (tf[id] ?? '').trim()
      if (!raw) continue
      const part = formatManualDescriptionPart(id, raw)
      if (part) pieces.push(part)
    }

    return pieces.join(' ').replace(/\s+/g, ' ').trim()
  })

  const codeSegments = computed(() => {
    const separator = sep.value
    const field = fields.value.find((f) => f.id === leafFieldId.value)
    const groupId = field?.group || 'tree'
    const accentColor = groupAccentMap.value[groupId] || '#3b82f6'

    const leafCode = hierarchyComplete.value
      ? optionCode(selections[leafFieldId.value])
      : ''

    const previewFirst = firstSegmentCode.value
    const segLeafText = hierarchyComplete.value
      ? (leafCode || '_'.repeat(4))
      : previewFirst
        ? previewFirst
        : '_'.repeat(4)

    const mainText = hierarchyComplete.value ? paddedMainStub.value : '_'.repeat(mainDigits.value)
    const varText = hierarchyComplete.value ? paddedVariant.value : '_'.repeat(variantDigits.value)

    const firstFilled = hierarchyComplete.value
      ? !!leafCode
      : !!previewFirst

    return [
      {
        text: segLeafText,
        fieldId: leafFieldId.value,
        type: 'field',
        filled: firstFilled,
        group: groupId,
        label: field?.label || 'Product code',
        accentColor,
      },
      { text: separator, fieldId: null, type: 'separator', filled: true },
      {
        text: mainText,
        fieldId: '__mainCounter__',
        type: 'field',
        filled: hierarchyComplete.value,
        group: 'configuration',
        label: 'Counter',
        accentColor: groupAccentMap.value.configuration || '#7c3aed',
      },
      { text: separator, fieldId: null, type: 'separator', filled: true },
      {
        text: varText,
        fieldId: '__variant__',
        type: 'field',
        filled: hierarchyComplete.value,
        group: 'configuration',
        label: 'Variant',
        accentColor: groupAccentMap.value.configuration || '#7c3aed',
      },
    ]
  })

  const isComplete = computed(() => {
    return fields.value.filter((f) => f.required).every((f) => {
      if (f.type === 'text') {
        return true
      }
      if (f.type === 'variantButton') {
        return unref(variantOrdinalRef) >= 1
      }
      return selections[f.id] != null
    })
  })

  return {
    codeSegments,
    generatedCode,
    generatedDescription,
    isComplete,
    hierarchyComplete,
    paddedVariant,
  }
}
