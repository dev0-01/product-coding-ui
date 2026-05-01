import { computed } from 'vue'

function normOption(o) {
  if (!o || typeof o !== 'object') return null
  return {
    code: o.value ?? o.code,
    description: o.label ?? o.description ?? '',
    shortCode: o.shortCode ?? o.value ?? o.code ?? '',
  }
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
      const parentCode = selections[edge.parentField]?.code
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
