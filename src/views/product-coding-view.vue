<template>
  <div class="coding-view">
    <div class="view-toolbar">
      <div class="breadcrumb">
        <span class="crumb">Coding Configuration</span>
        <i class="pi pi-angle-right crumb-sep"></i>
        <span class="crumb crumb-active">Product Coding</span>
      </div>
    </div>

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
      :error="error"
      toolbar-placement="top"
      :show-acknowledge="isRev2"
      :show-option-codes="!isRev2"
      :free-text-selections="textFields"
      :padded-variant="paddedVariantDisplay"
      :variant-step-active="variantOrdinal > 1"
      @update:selection="onSelectionChange"
      @update:freetext="onFreeText"
      @clear="clearSelections"
      @increment-variant="incrementVariant"
      @acknowledge="onAcknowledge"
      @retry="loadConfig"
    />
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import CodingForm from '../components/coding-form.vue'
import { useCodingConfig } from '../composables/use-coding-config.js'
import { useCodeGenerator } from '../composables/use-code-generator.js'
import { useResolvedHierarchyGroups } from '../composables/use-product-hierarchy-groups.js'
import { useProductRev2Preview } from '../composables/use-product-rev2-preview.js'

const CONFIG_NAME = 'product'

const {
  fields,
  groups,
  hierarchyRelations,
  previewConfig,
  loading,
  error,
  loadConfig,
} = useCodingConfig(CONFIG_NAME)

const selections = reactive({})
const textFields = reactive({ voltage: '', capacity: '' })
const variantOrdinal = ref(1)
const ackBanner = ref(false)
let ackTimer = null

const displayGroups = useResolvedHierarchyGroups(groups, hierarchyRelations, selections)

const standardGen = useCodeGenerator(selections, previewConfig, fields, groups)

const rev2 = useProductRev2Preview(
  selections,
  textFields,
  variantOrdinal,
  previewConfig,
  fields,
  groups,
)

const isRev2 = computed(() => previewConfig.value?.productRev2 === true)

const codeSegments = computed(() =>
  isRev2.value ? rev2.codeSegments.value : standardGen.codeSegments.value,
)

const generatedCode = computed(() =>
  isRev2.value ? rev2.generatedCode.value : standardGen.generatedCode.value,
)

const generatedDescription = computed(() =>
  isRev2.value ? rev2.generatedDescription.value : standardGen.generatedDescription.value,
)

const paddedVariantDisplay = computed(() =>
  isRev2.value ? rev2.paddedVariant.value : '001',
)

const hierarchyFingerprint = computed(() =>
  ['series', 'model', 'class', 'subClass'].map((k) => selections[k]?.code ?? '').join('|'),
)

function syncSelectionsToDisplayedOptions() {
  for (const g of displayGroups.value) {
    for (const f of g.fields) {
      if (f.type !== 'select') continue
      const cur = selections[f.id]
      if (!cur || typeof cur !== 'object' || !cur.code) continue
      const next = f.options?.find((o) => o.code === cur.code)
      if (next && next !== cur) {
        selections[f.id] = next
      }
    }
  }
}

watch(displayGroups, syncSelectionsToDisplayedOptions, { deep: true })

watch(
  () => selections.series,
  () => {
    selections.model = null
    selections.class = null
    selections.subClass = null
  },
)

watch(
  () => selections.model,
  () => {
    selections.class = null
    selections.subClass = null
  },
)

watch(
  () => selections.class,
  () => {
    selections.subClass = null
  },
)

watch(hierarchyFingerprint, () => {
  variantOrdinal.value = 1
})

watch([displayGroups, () => selections.class], autoSelectSubClass, { deep: true })

function autoSelectSubClass() {
  if (!isRev2.value || !selections.class) return
  const fld = displayGroups.value
    .flatMap((g) => g.fields)
    .find((f) => f.id === 'subClass')
  const opts = fld?.options
  if (!Array.isArray(opts) || opts.length !== 1) return
  const only = opts[0]
  if (!selections.subClass || selections.subClass.code !== only.code) {
    selections.subClass = only
  }
}

function onFreeText({ fieldId, value }) {
  textFields[fieldId] = value
}

function onSelectionChange({ fieldId, value }) {
  selections[fieldId] = value || null
}

function clearSelections() {
  for (const key of Object.keys(selections)) {
    selections[key] = null
  }
  textFields.voltage = ''
  textFields.capacity = ''
  variantOrdinal.value = 1
}

function incrementVariant() {
  variantOrdinal.value += 1
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
