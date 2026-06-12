<template>
  <div class="coding-view">
    <CodingForm
      :groups="displayGroups"
      :selections="selections"
      :codeSegments="codeSegments"
      :generatedCode="generatedCode"
      :generatedDescription="generatedDescription"
      :loading="loading"
      :free-text-selections="textFields"
      :show-option-codes="false"
      :error="error"
      @update:selection="onSelectionChange"
      @update:freetext="onFreeText"
      @clear="clearSelections"
      @retry="loadConfig"
    />
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import CodingForm from '../components/coding-form.vue'
import { useCodingConfig } from '../composables/use-coding-config.js'
import { useMaterialCodeGenerator } from '../composables/use-material-code-generator.js'
import { normalizeSelectedOption } from '../composables/use-selection-helpers.js'

const CONFIG_NAME = 'material'

const { fields, groups, previewConfig, loading, error, loadConfig } =
  useCodingConfig(CONFIG_NAME)

const selections = reactive({})
const textFields = reactive({ thickness: '' })

const thicknessField = {
  id: 'thickness',
  label: 'Kalınlık Bilgisi',
  required: false,
  type: 'text',
  group: 'technical',
  options: [],
}

const displayGroups = computed(() => {
  if (
    groups.value.some((group) =>
      group.fields?.some((field) => field.id === 'thickness'),
    )
  ) {
    return groups.value
  }

  if (!groups.value.length) {
    return [
      {
        id: 'technical',
        label: 'Technical',
        accent: '#64748b',
        fields: [thicknessField],
      },
    ]
  }

  const lastGroupIndex = groups.value.length - 1
  return groups.value.map((group, index) => {
    if (index !== lastGroupIndex) return group
    return {
      ...group,
      fields: [...(group.fields || []), thicknessField],
    }
  })
})

const { codeSegments, generatedCode, generatedDescription } =
  useMaterialCodeGenerator(selections, textFields, previewConfig, fields, groups)

function onSelectionChange({ fieldId, value }) {
  selections[fieldId] =
    value && typeof value === 'object'
      ? normalizeSelectedOption(value)
      : value || null
}

function onFreeText({ fieldId, value }) {
  textFields[fieldId] = value
}

function clearSelections() {
  for (const key of Object.keys(selections)) {
    selections[key] = null
  }
  textFields.thickness = ''
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.coding-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  inline-size: 100%;
}

.view-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
}

.crumb {
  font-size: 12px;
  color: var(--text-muted, #8b939c);
}

.crumb-sep {
  font-size: 10px;
  color: var(--text-muted, #8b939c);
}

.crumb-active {
  color: var(--text-primary, #1a1d21);
  font-weight: 600;
}
</style>
