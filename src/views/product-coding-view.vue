<template>
  <div class="coding-view">
    <div class="view-toolbar">
      <div class="breadcrumb">
        <span class="crumb">Coding Configuration</span>
        <i class="pi pi-angle-right crumb-sep"></i>
        <span class="crumb crumb-active">Product Coding</span>
      </div>
    </div>

    <CodingForm
      :groups="groups"
      :selections="selections"
      :codeSegments="codeSegments"
      :generatedCode="generatedCode"
      :generatedDescription="generatedDescription"
      :loading="loading"
      :error="error"
      @update:selection="onSelectionChange"
      @clear="clearSelections"
      @retry="loadConfig"
    />
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import CodingForm from '../components/coding-form.vue'
import { useCodingConfig } from '../composables/use-coding-config.js'
import { useCodeGenerator } from '../composables/use-code-generator.js'

const CONFIG_NAME = 'product'

const { fields, groups, previewConfig, loading, error, loadConfig } =
  useCodingConfig(CONFIG_NAME)

const selections = reactive({})

const { codeSegments, generatedCode, generatedDescription } = useCodeGenerator(
  selections,
  previewConfig,
  fields,
  groups,
)

function onSelectionChange({ fieldId, value }) {
  selections[fieldId] = value || null
}

function clearSelections() {
  for (const key of Object.keys(selections)) {
    selections[key] = null
  }
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
</style>
