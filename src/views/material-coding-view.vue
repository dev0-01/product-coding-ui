<template>
  <div class="coding-view">
    <p v-if="ackBanner" class="ack-banner">
      ACK — no persistence in this phase (per spec).
    </p>

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
      :hierarchy-relations="hierarchyRelations"
      toolbar-placement="top"
      :show-acknowledge="true"
      @update:selection="onSelectionChange"
      @update:freetext="onFreeText"
      @clear="clearSelections"
      @acknowledge="onAcknowledge"
      @retry="loadConfig"
    />
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import CodingForm from '../components/coding-form.vue'
import { useCodingConfig } from '../composables/use-coding-config.js'
import { useMaterialCodeGenerator } from '../composables/use-material-code-generator.js'
import { useResolvedHierarchyGroups } from '../composables/use-product-hierarchy-groups.js'
import { normalizeSelectedOption } from '../composables/use-selection-helpers.js'

const CONFIG_NAME = 'material'

const { fields, groups, hierarchyRelations, previewConfig, loading, error, loadConfig } =
  useCodingConfig(CONFIG_NAME)

const selections = reactive({})
const textFields = reactive({ thickness: '' })
const ackBanner = ref(false)
let ackTimer = null

const resolvedGroups = useResolvedHierarchyGroups(groups, hierarchyRelations, selections)

const thicknessField = {
  id: 'thickness',
  label: 'Kalınlık Bilgisi',
  required: false,
  type: 'text',
  group: 'technical',
  options: [],
}

const displayGroups = computed(() => {
  const base = resolvedGroups.value

  if (base.some((group) => group.fields?.some((field) => field.id === 'thickness'))) {
    return base
  }

  if (!base.length) {
    return [
      {
        id: 'technical',
        label: 'Technical',
        accent: '#64748b',
        fields: [thicknessField],
      },
    ]
  }

  const lastGroupIndex = base.length - 1
  return base.map((group, index) => {
    if (index !== lastGroupIndex) return group
    return {
      ...group,
      fields: [...(group.fields || []), thicknessField],
    }
  })
})

function selectionCode(sel) {
  if (sel == null || sel === '') return null
  if (typeof sel === 'object') {
    const c = sel.code ?? sel.value
    return c == null || c === '' ? null : String(c)
  }
  return String(sel)
}

watch(
  () => selectionCode(selections.series),
  (code, prev) => {
    if (code === prev) return
    selections.model = null
    selections.class = null
    selections.subClass = null
  },
)

watch(
  () => selectionCode(selections.model),
  (code, prev) => {
    if (code === prev) return
    selections.class = null
    selections.subClass = null
  },
)

watch(
  () => selectionCode(selections.class),
  (code, prev) => {
    if (code === prev) return
    selections.subClass = null
  },
)

const { codeSegments, generatedCode, generatedDescription } =
  useMaterialCodeGenerator(selections, textFields, previewConfig, fields, resolvedGroups)

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

function onAcknowledge() {
  if (ackTimer) clearTimeout(ackTimer)
  ackBanner.value = true
  ackTimer = setTimeout(() => {
    ackBanner.value = false
  }, 2400)
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

.ack-banner {
  margin: 0;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-secondary, #5a6570);
  background: var(--surface-section, #f4f6f8);
  border: 1px solid var(--surface-border-light, #dee2e6);
  border-radius: var(--radius-sm, 4px);
}
</style>
