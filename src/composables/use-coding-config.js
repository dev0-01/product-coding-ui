import { ref } from 'vue'
import { getCodingConfig } from '../api/coding-config-api.js'

/**
 * Composable that loads coding config from the backend and
 * structures it for the CodingForm component.
 *
 * Zero hardcoded field lists, labels, or group mappings.
 * Everything is derived from the backend config response.
 */
export function useCodingConfig(configName) {
  const fields = ref([])
  const groups = ref([])
  const previewConfig = ref({ codeFormat: [], codeSeparator: '-', descriptionFormat: [] })
  const hierarchyRelations = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function loadConfig() {
    loading.value = true
    error.value = null

    try {
      const data = await getCodingConfig(configName)

      hierarchyRelations.value = data.hierarchyRelations ?? null

      fields.value = data.fields.map((f) => ({
        id: f.name,
        label: f.label,
        required: f.required,
        type: f.type || 'select',
        group: f.group,
        options: (f.options || []).map((o) => ({
          code: o.value != null ? o.value : o.code,
          description: o.label != null ? o.label : o.description,
          shortCode: o.shortCode != null ? o.shortCode : (o.value != null ? o.value : o.code),
        })),
      }))

      const groupDefs = data.groups || []
      groups.value = groupDefs
        .map((g) => ({
          ...g,
          fields: fields.value.filter((f) => f.group === g.id),
        }))
        .filter((g) => g.fields.length > 0)

      const groupedIds = new Set(groups.value.flatMap((g) => g.fields.map((f) => f.id)))
      const ungrouped = fields.value.filter((f) => !groupedIds.has(f.id))
      if (ungrouped.length > 0) {
        groups.value.push({
          id: 'other',
          label: 'Other',
          accent: '#64748b',
          fields: ungrouped,
        })
      }

      if (groups.value.length === 0 && fields.value.length > 0) {
        groups.value = [
          { id: 'default', label: 'Fields', accent: '#3b82f6', fields: fields.value },
        ]
      }

      previewConfig.value = data.preview || { codeFormat: [], codeSeparator: '-', descriptionFormat: [] }
    } catch (err) {
      error.value = err.message || 'Failed to load configuration'
      console.error(`Failed to load config for ${configName}:`, err)
    } finally {
      loading.value = false
    }
  }

  return {
    fields,
    groups,
    previewConfig,
    hierarchyRelations,
    loading,
    error,
    loadConfig,
  }
}
