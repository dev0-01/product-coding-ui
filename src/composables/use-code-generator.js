import { computed } from 'vue'

/**
 * Composable that generates code and description strings in real-time
 * based on the user's selections and the backend-provided preview config.
 *
 * Follows the reference approach: map selected values by field name, then join.
 *
 * @param {Reactive<Object>} selections - reactive map of fieldId -> selected option { code, description }
 * @param {Ref<Object>} previewConfig - { codeFormat: [...], codeSeparator: string, descriptionFormat: [...] }
 * @param {Ref<Array>} fields - field definitions from config
 * @param {Ref<Array>} groups - group definitions from config (for accent color lookup)
 */
export function useCodeGenerator(selections, previewConfig, fields, groups) {
  const groupAccentMap = computed(() => {
    const map = {}
    for (const g of groups.value) {
      map[g.id] = g.accent || '#3b82f6'
    }
    return map
  })

  const codeSegments = computed(() => {
    const codeFormat = previewConfig.value.codeFormat
    if (!codeFormat || !codeFormat.length) return []

    const separator = previewConfig.value.codeSeparator || '-'
    const segments = []

    codeFormat.forEach((fieldId, idx) => {
      if (idx > 0) {
        segments.push({ text: separator, fieldId: null, type: 'separator', filled: true })
      }

      const selected = selections[fieldId]
      const field = fields.value.find((f) => f.id === fieldId)
      const placeholderLen = field?.options?.[0]?.code?.length || 2
      const groupId = field?.group || null

      segments.push({
        text: selected?.code || '_'.repeat(placeholderLen),
        fieldId,
        type: 'field',
        filled: !!selected,
        group: groupId,
        label: field?.label || fieldId,
        accentColor: groupId ? (groupAccentMap.value[groupId] || '#3b82f6') : '#3b82f6',
      })
    })

    return segments
  })

  const generatedCode = computed(() => {
    const codeFormat = previewConfig.value.codeFormat
    if (!codeFormat || !codeFormat.length) return ''

    const separator = previewConfig.value.codeSeparator || '-'
    return codeFormat
      .map((key) => selections[key]?.code || '')
      .join(separator)
  })

  const generatedDescription = computed(() => {
    const descFormat = previewConfig.value.descriptionFormat
    if (!descFormat || !descFormat.length) return ''

    return descFormat
      .map((key) => selections[key]?.description || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  })

  const isComplete = computed(() => {
    return fields.value
      .filter((f) => f.required)
      .every((f) => selections[f.id] != null)
  })

  return {
    codeSegments,
    generatedCode,
    generatedDescription,
    isComplete,
  }
}
