export function normalizeSelectedOption(value) {
  if (value == null || value === '') return null
  if (typeof value !== 'object') return value

  const raw = value.code ?? value.value
  if (raw == null || raw === '') return null

  return {
    code: String(raw),
    description: value.description ?? value.label ?? '',
    shortCode:
      value.shortCode != null ? String(value.shortCode) : String(raw),
  }
}

export function selectedCode(selections, fieldId) {
  if (!fieldId) return ''
  const selected = selections[fieldId]
  if (selected == null || selected === '') return ''
  if (typeof selected !== 'object') return String(selected)
  const code = selected.code ?? selected.value
  return code == null || code === '' ? '' : String(code)
}

export function selectedDescription(selections, fieldId) {
  if (!fieldId) return ''
  const selected = selections[fieldId]
  if (selected == null || selected === '') return ''
  if (typeof selected !== 'object') return String(selected)
  const value =
    selected.description ?? selected.label ?? selected.code ?? selected.value
  return String(value ?? '').trim()
}

export function selectedShortCode(selections, fieldId) {
  if (!fieldId) return ''
  const selected = selections[fieldId]
  if (!selected || typeof selected !== 'object') return ''
  const shortCode = selected.shortCode
  return shortCode == null || shortCode === '' ? '' : String(shortCode)
}

export function selectedFullCode(selections, fieldId) {
  if (!fieldId) return ''
  const selected = selections[fieldId]
  if (!selected || typeof selected !== 'object') return ''

  const values = [
    selected.fullCode,
    selected.materialCode,
    selected.value,
    selected.label,
    selected.description,
  ]

  for (const value of values) {
    const match = String(value ?? '').match(/\b\d{5}\b/)
    if (match) return match[0]
  }

  return ''
}
