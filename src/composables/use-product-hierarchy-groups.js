import { computed } from 'vue'

function normOption(o) {
  if (!o || typeof o !== 'object') return null
  const raw = o.value ?? o.code
  if (raw == null || raw === '') return null
  const code = String(raw)
  let description = o.label != null ? o.label : o.description ?? ''
  description = String(description).trim()
  if (description === '' || description === '-') {
    const sc = o.shortCode != null ? String(o.shortCode).trim() : ''
    description = sc && sc !== '-' ? sc : 'Default'
  }
  const sc = o.shortCode != null ? o.shortCode : raw
  return {
    code,
    description,
    shortCode: sc != null ? String(sc) : code,
  }
}

/** Parent lookup key for hierarchy (matches backend byParentCode map keys). */
function selectionToParentCode(sel) {
  if (sel == null || sel === '') return ''
  if (typeof sel === 'object') {
    const c = sel.code != null ? sel.code : sel.value
    if (c == null || c === '') return ''
    return String(c)
  }
  return String(sel)
}

/**
 * Applies hierarchyRelations so each select's options depend on the parent field's selection.
 * When hierarchy is absent, groups are returned unchanged (e.g. material coding).
 */
export function useResolvedHierarchyGroups(groupsRef, hierarchyRef, selections) {
  return computed(() => {
    const hier = hierarchyRef.value
    if (!hier) {
      return groupsRef.value
    }

    // Ensure Vue tracks cascade fields (reactive `selections` from parent).
    void selections.series
    void selections.model
    void selections.class
    void selections.subClass

    function optionsFor(field) {
      if (field.type !== 'select') {
        return field.options || []
      }
      if (field.id === 'series') {
        return (field.options || []).map(normOption).filter(Boolean)
      }
      const edge = hier[field.id]
      if (!edge || !edge.parentField) {
        return (field.options || []).map(normOption).filter(Boolean)
      }
      const parentCode = selectionToParentCode(selections[edge.parentField])
      if (!parentCode) {
        return []
      }
      const raw = edge.byParentCode?.[parentCode]
      return Array.isArray(raw) ? raw.map(normOption).filter(Boolean) : []
    }

    return groupsRef.value.map((g) => ({
      ...g,
      fields: g.fields.map((f) => {
        const opts = optionsFor(f)
        return { ...f, options: opts }
      }),
    }))
  })
}
