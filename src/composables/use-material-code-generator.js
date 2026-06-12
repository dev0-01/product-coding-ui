import { computed } from 'vue'
import {
  selectedCode,
  selectedDescription,
  selectedShortCode,
  selectedFullCode,
} from './use-selection-helpers.js'

const MATERIAL_SEQUENCE = '0001'

export function useMaterialCodeGenerator(selections, textFields, previewConfig, fields, groups) {
  const codeSegments = computed(() => {
    const prefix = partAssemblyPrefix(selections, fields)
    const materialCode = materialPathPreviewCode(selections, fields)
    const leafFieldId = materialLeafFieldId(fields)
    const leafField = fields.value.find((field) => field.id === leafFieldId)
    const firstSegment = `${prefix || '_'}${materialCode}`
    const firstFilled = Boolean(prefix)

    return [
      {
        text: firstSegment,
        fieldId: leafFieldId,
        type: 'field',
        filled: firstFilled,
        group: leafField?.group || null,
        label: leafField?.label || 'Sub-class',
        accentColor: groupAccent(groups, leafField?.group),
      },
      { text: '-', fieldId: null, type: 'separator', filled: true },
      {
        text: MATERIAL_SEQUENCE,
        fieldId: '__materialSequence__',
        type: 'field',
        filled: firstFilled,
        group: null,
        label: 'Sequence',
        accentColor: '#64748b',
      },
    ]
  })

  const generatedCode = computed(() => {
    const prefix = partAssemblyPrefix(selections, fields)
    const materialCode = materialPathPreviewCode(selections, fields)
    if (!prefix) return ''
    return `${prefix}${materialCode}-${MATERIAL_SEQUENCE}`
  })

  const generatedDescription = computed(() => {
    const format = previewConfig.value?.descriptionFormat || []
    const descriptionKeys = format.length
      ? normalizeDescriptionKeys(format, fields)
      : fields.value
          .filter((field) => field.type !== 'text')
          .map((field) => field.id)

    const descriptionParts = descriptionKeys.map((key) => {
      const selectedDesc = selectedDescription(selections, key)
      if (selectedDesc) return selectedDesc
      if (key === 'thickness') return formatDescription(textFields.thickness)
      return ''
    })

    const classFieldId = resolveMaterialFieldId(fields.value, 'class')
    if (classFieldId && !descriptionKeys.includes(classFieldId)) {
      const classDesc = selectedDescription(selections, classFieldId)
      if (classDesc) descriptionParts.push(classDesc)
    }

    if (!descriptionKeys.includes('thickness')) {
      const thicknessDetail = formatDescription(textFields.thickness)
      if (thicknessDetail) descriptionParts.push(thicknessDetail)
    }

    return descriptionParts
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  })

function normalizeDescriptionKeys(keys, fields) {
  return keys
    .map((key) => resolveMaterialFieldId(fields.value, key) || key)
    .filter(Boolean)
}

function resolveMaterialFieldId(fields, key) {
  const normalized = normalizeKey(key)

  if (
    [
      'partassembly',
      'part_assembly',
      'partorassembly',
      'part / assembly',
      'part assembly',
    ].includes(normalized)
  ) {
    return findFieldId(fields, ['partAssembly', 'part_assembly', 'partOrAssembly'], [
      'part / assembly',
      'part assembly',
    ])
  }

  if (
    ['productfamily', 'productfamilygroup', 'product', 'product family'].includes(
      normalized,
    )
  ) {
    return findFieldId(fields, ['productFamily', 'productFamilyGroup', 'product'], [
      'product family',
    ])
  }

  if (['model', 'productmodel'].includes(normalized)) {
    return findFieldId(fields, ['model', 'productModel'], ['model'])
  }

  if (['class', 'materialclass'].includes(normalized)) {
    return findFieldId(fields, ['class', 'materialClass'], ['class'])
  }

  if (
    ['subclass', 'sub_class', 'materialsubclass', 'sub class', 'sub-class'].includes(
      normalized,
    )
  ) {
    return findFieldId(
      fields,
      ['subClass', 'subclass', 'sub_class', 'materialSubClass'],
      ['sub class', 'sub-class'],
    )
  }

  if (['thickness', 'kalınlık', 'kalinlik'].includes(normalized)) {
    return findFieldId(fields, ['thickness'], ['kalınlık bilgisi'])
  }

  return findFieldId(fields, [key], [key])
}

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

function partAssemblyPrefix(selections, fields) {
  const partAssemblyId = findFieldId(fields.value, [
    'partAssembly',
    'part_assembly',
    'partOrAssembly',
  ], ['part / assembly', 'part assembly'])
  const code = selectedCode(selections, partAssemblyId)
  return code ? code.charAt(0).toUpperCase() : ''
}

function materialLeafFieldId(fields) {
  return (
    findFieldId(fields.value, ['subClass', 'subclass', 'sub_class', 'materialSubClass'], ['sub class', 'sub-class']) ||
    findFieldId(fields.value, ['class', 'materialClass'], ['class'])
  )
}

function materialPathPreviewCode(selections, fields) {
  return [
    selectedPositionDigit(selections, findFieldId(fields.value, ['productFamily', 'productFamilyGroup', 'product'], ['product family']), 0) || '_',
    selectedPositionDigit(selections, findFieldId(fields.value, ['model', 'productModel'], ['model']), 1) || '_',
    selectedPositionDigit(selections, findFieldId(fields.value, ['class', 'materialClass'], ['class']), 2) || '_',
    selectedPositionDigit(selections, findFieldId(fields.value, ['subClass', 'subclass', 'sub_class', 'materialSubClass'], ['sub class', 'sub-class']), 3) || '_',
    (selectedPositionDigit(selections, findFieldId(fields.value, ['subClass', 'subclass', 'sub_class', 'materialSubClass'], ['sub class', 'sub-class']), 3) ? '0' : '_'),
  ].join('')
}

function selectedPositionDigit(selections, fieldId, position) {
  const candidates = [
    selectedFullCode(selections, fieldId),
    selectedShortCode(selections, fieldId),
    selectedCode(selections, fieldId),
  ].filter(Boolean)

  for (const candidate of candidates) {
    const digits = String(candidate).replace(/\D/g, '')
    if (!digits) continue
    return digits[position] || digits[digits.length - 1]
  }

  return ''
}

function findFieldId(fields, idCandidates, labelCandidates) {
  const normalizedIds = idCandidates.map(normalizeKey)
  const byId = fields.find((field) => normalizedIds.includes(normalizeKey(field.id)))
  if (byId) return byId.id

  const normalizedLabels = labelCandidates.map(normalizeText)
  const byLabel = fields.find((field) => normalizedLabels.includes(normalizeText(field.label)))
  return byLabel?.id || null
}

function normalizeKey(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function normalizeText(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function groupAccent(groups, groupId) {
  const group = groups.value.find((item) => item.id === groupId)
  return group?.accent || '#3b82f6'
}
