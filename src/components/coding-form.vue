<template>
  <div class="coding-form">
    <div v-if="loading" class="state-overlay">
      <i class="pi pi-spin pi-spinner"></i>
      <span>Loading configuration...</span>
    </div>

    <div v-else-if="error" class="state-overlay state-error">
      <i class="pi pi-exclamation-triangle"></i>
      <span>{{ error }}</span>
      <button class="plm-btn plm-btn-outline" @click="$emit('retry')">
        <i class="pi pi-refresh"></i> Retry
      </button>
    </div>

    <template v-else>
      <!-- ── Top toolbar (Product Rev 2) ── -->
      <div
        v-if="toolbarPlacement === 'top'"
        class="plm-toolbar plm-toolbar-top"
      >
        <div class="toolbar-spacer"></div>
        <div class="toolbar-actions">
          <button
            type="button"
            class="plm-btn plm-btn-outline"
            :disabled="!hasDraft"
            @click="$emit('clear')"
          >
            <i class="pi pi-refresh"></i> Reset All Fields
          </button>
          <button
            v-if="showAcknowledge"
            type="button"
            class="plm-btn plm-btn-primary"
            @click="$emit('acknowledge')"
          >
            <i class="pi pi-check"></i> OK
          </button>
        </div>
      </div>

      <!-- ── Code Output Panel ── -->
      <div class="plm-panel code-output-panel">
        <div class="panel-header">
          <div class="panel-header-left">
            <i class="pi pi-hashtag panel-icon"></i>
            <span class="panel-title">Code Output</span>
          </div>
        </div>

        <div class="panel-body">
          <div class="code-display" v-if="codeSegments.length">
            <template v-for="(segment, i) in codeSegments" :key="i">
              <div v-if="segment.type === 'separator'" class="sep-wrapper">
                <span class="code-sep">{{ segment.text }}</span>
              </div>
              <div v-else class="seg-wrapper">
                <div class="seg-chars">
                  <span
                    v-for="(ch, j) in segment.text.split('')"
                    :key="j"
                    class="code-char"
                    :class="{ 'char-empty': !segment.filled }"
                    :style="charStyle(segment)"
                  >{{ ch }}</span>
                </div>
                <span
                  class="seg-label"
                  :style="{ color: segment.accentColor || '#8b939c' }"
                >{{ segment.label }}</span>
              </div>
            </template>
          </div>

          <div class="output-rows">
            <div class="output-row">
              <span class="output-key">Code</span>
              <span class="output-val mono" :class="{ 'val-empty': !hasAnySelection }">
                {{ generatedCode || codePlaceholder }}
              </span>
            </div>
            <div class="output-row">
              <span class="output-key">Description</span>
              <span class="output-val" :class="{ 'val-empty': !generatedDescription }">
                {{ generatedDescription || 'Select values to generate description' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Field Group Panels ── -->
      <div v-for="group in groups" :key="group.id" class="plm-panel">
        <div class="panel-header" :style="{ borderLeftColor: group.accent }">
          <div class="panel-header-left">
            <i class="pi pi-list panel-icon"></i>
            <span class="panel-title">{{ group.label }}</span>
            <span v-if="group.tag" class="panel-badge badge-auto">{{ group.tag }}</span>
          </div>
          <span class="panel-field-count">{{ group.fields.length }} fields</span>
        </div>

        <div class="panel-body panel-fields">
          <div v-for="field in group.fields" :key="field.id" class="field-row">
            <label :for="field.id" class="field-label">
              {{ field.label }}
              <span v-if="field.required" class="field-required">*</span>
            </label>

            <template v-if="field.type === 'select'">
            <Select
              :id="field.id"
              :modelValue="selections[field.id]"
              @update:modelValue="onFieldChange(field.id, $event)"
              :options="field.options"
              optionLabel="description"
              :placeholder="`-- Select ${field.label} --`"
              class="field-select"
              showClear
            >
              <template #option="{ option }">
                <div v-if="showOptionCodes" class="opt-item">
                  <span class="opt-code">{{ option.code }}</span>
                  <span class="opt-desc">{{ option.description }}</span>
                </div>
                <span v-else class="opt-desc-only">{{ option.description }}</span>
              </template>
              <template #value="{ value }">
                <div v-if="value">
                  <template v-if="showOptionCodes">
                    <div class="opt-item">
                      <span class="opt-code">{{ value.code }}</span>
                      <span class="opt-desc">{{ value.description }}</span>
                    </div>
                  </template>
                  <span v-else class="opt-desc-only">{{ value.description }}</span>
                </div>
              </template>
            </Select>

            <div v-if="selections[field.id]" class="field-hint" :class="{ 'field-hint-codes-hidden': !showOptionCodes }">
              <i class="pi pi-check-circle"></i>
              <span v-if="showOptionCodes">{{ selections[field.id].code }} &middot; {{ selections[field.id].description }}</span>
              <span v-else>{{ selections[field.id].description }}</span>
            </div>
            </template>

            <InputText
              v-else-if="field.type === 'text'"
              :id="field.id"
              class="field-input"
              :placeholder="field.label"
              :modelValue="freeTextSelections[field.id] ?? ''"
              @update:modelValue="onFreeText(field.id, $event)"
            />

            <div v-else-if="field.type === 'variantButton'" class="variant-field">
              <button
                type="button"
                class="plm-btn plm-btn-accent"
                @click="$emit('increment-variant')"
              >
                <i class="pi pi-plus"></i>
                Variant
              </button>
              <span class="variant-readout mono">{{ paddedVariant }}</span>
              <span class="variant-caption">Click to increment variant counter (preview)</span>
            </div>

          </div>
        </div>
      </div>

      <!-- ── Bottom toolbar (Material / fallback) ── -->
      <div v-if="toolbarPlacement === 'bottom' && hasAnySelection" class="plm-toolbar">
        <button class="plm-btn plm-btn-outline" @click="$emit('clear')">
          <i class="pi pi-refresh"></i> Reset All Fields
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'

const props = defineProps({
  groups: { type: Array, required: true },
  selections: { type: Object, required: true },
  codeSegments: { type: Array, default: () => [] },
  generatedCode: { type: String, default: '' },
  generatedDescription: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
  toolbarPlacement: { type: String, default: 'bottom' },
  showAcknowledge: { type: Boolean, default: false },
  paddedVariant: { type: String, default: '001' },
  freeTextSelections: { type: Object, default: () => ({}) },
  variantStepActive: { type: Boolean, default: false },
  showOptionCodes: { type: Boolean, default: true },
})

const emit = defineEmits([
  'update:selection',
  'update:freetext',
  'clear',
  'retry',
  'acknowledge',
  'increment-variant',
])

const hasAnySelection = computed(() =>
  Object.values(props.selections).some((v) => v != null),
)

const hasDraft = computed(
  () =>
    hasAnySelection.value ||
    Object.values(props.freeTextSelections).some((v) =>
      String(v ?? '').trim(),
    ) ||
    props.variantStepActive,
)

const codePlaceholder = computed(() => {
  if (!props.codeSegments.length) return '---'
  return props.codeSegments.map((s) => s.text).join('')
})

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return { r, g, b }
}

function charStyle(segment) {
  if (!segment.filled) return {}
  const accent = segment.accentColor || '#3b82f6'
  const { r, g, b } = hexToRgb(accent)
  return {
    background: `rgba(${r}, ${g}, ${b}, 0.12)`,
    color: accent,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`,
  }
}

function onFieldChange(fieldId, value) {
  emit('update:selection', { fieldId, value })
}

function onFreeText(fieldId, value) {
  emit('update:freetext', { fieldId, value })
}
</script>

<style scoped>
.coding-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── State Overlays ── */
.state-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 24px;
  color: var(--text-muted, #8b939c);
  font-size: 13px;
  background: var(--surface-card);
  border: 1px solid var(--surface-border-light);
  border-radius: var(--radius-md);
}

.state-overlay i {
  font-size: 24px;
}

.state-error {
  color: var(--color-danger);
}

/* ── PLM Panel ── */
.plm-panel {
  background: var(--surface-card, #fff);
  border: 1px solid var(--surface-border-light, #dee2e6);
  border-radius: var(--radius-md, 4px);
  box-shadow: var(--shadow-panel);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--surface-panel-header, #f0f2f5);
  border-bottom: 1px solid var(--surface-border-light, #dee2e6);
  border-left: 3px solid var(--plm-accent, #005685);
  min-height: 36px;
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  font-size: 12px;
  color: var(--text-muted, #8b939c);
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #1a1d21);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.panel-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 2px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.badge-auto {
  background: var(--color-success-bg, #d4edda);
  color: var(--color-success, #1e7e34);
}

.panel-field-count {
  font-size: 11px;
  color: var(--text-muted);
}

.panel-body {
  padding: 14px;
}

/* ── Code Character Display ── */
.code-display {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  flex-wrap: wrap;
  padding: 10px 0 14px;
}

.seg-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.seg-chars {
  display: flex;
  gap: 2px;
}

.code-char {
  width: 30px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Consolas', 'Courier New', monospace;
  font-weight: 600;
  font-size: 13px;
  border-radius: var(--radius-sm, 3px);
  border: 1px solid;
}

.char-empty {
  background: #fff8e1 !important;
  color: #a67c00 !important;
  border-color: #ffe082 !important;
  border-style: dashed;
}

.sep-wrapper {
  display: flex;
  align-items: flex-start;
  padding-top: 6px;
}

.code-sep {
  font-family: 'Consolas', monospace;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-muted, #8b939c);
  padding: 0 1px;
}

.seg-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Output Rows ── */
.output-rows {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--surface-border-light, #dee2e6);
}

.output-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--surface-border-light, #dee2e6);
}

.output-row:last-child {
  border-bottom: none;
}

.output-key {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #8b939c);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 110px;
  flex-shrink: 0;
}

.output-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #1a1d21);
}

.output-val.mono {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  letter-spacing: 0.05em;
}

.val-empty {
  font-weight: 400;
  color: var(--text-muted, #8b939c);
}

/* ── Field Rows (vertical layout: label above, select below) ── */
.panel-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}

.field-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--surface-border-light, #dee2e6);
}

.field-row:last-child {
  border-bottom: none;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #5a6570);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.field-required {
  color: var(--color-danger, #c62828);
  margin-left: 2px;
}

.field-select {
  width: 100%;
  min-width: 0;
}

.field-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-success, #1e7e34);
  margin-top: 2px;
}

.field-hint i {
  font-size: 11px;
}

.field-hint-codes-hidden {
  /* In Rev2, show hint but without the code part */
  color: var(--text-muted, #8b939c);
}

/* ── Dropdown Options ── */
.opt-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.opt-code {
  font-family: 'Consolas', monospace;
  font-weight: 600;
  font-size: 12px;
  color: var(--plm-accent, #005685);
  background: var(--plm-accent-light, #e8f4fc);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  min-width: 32px;
  text-align: center;
}

.opt-desc {
  color: var(--text-primary, #1a1d21);
  font-size: 12px;
}

/* ── PLM Buttons ── */
.plm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.1s ease;
  border: 1px solid;
  white-space: nowrap;
}

.plm-btn i {
  font-size: 12px;
}

.plm-btn-outline {
  background: var(--surface-card, #fff);
  border-color: var(--surface-border, #c8ced3);
  color: var(--text-secondary, #5a6570);
}

.plm-btn-outline:hover {
  background: var(--surface-section, #f4f6f8);
  border-color: var(--text-muted, #8b939c);
  color: var(--text-primary);
}

/* ── Toolbar ── */
.plm-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 6px 0;
}

.plm-toolbar-top {
  gap: 8px;
  padding: 4px 0 2px;
}

.toolbar-spacer {
  flex: 1;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plm-btn-primary {
  background: var(--plm-accent, #005685);
  border-color: var(--plm-accent, #005685);
  color: #fff;
}

.plm-btn-primary:hover:not(:disabled) {
  opacity: 0.92;
  color: #fff;
}

.plm-btn-accent {
  background: #f5f3ff;
  border-color: #c4b5fd;
  color: var(--text-secondary, #5a6570);
}

.plm-btn-accent:hover:not(:disabled) {
  border-color: #8b5cf6;
}

.plm-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.field-input {
  width: 100%;
  font-size: 13px;
}

.opt-desc-only {
  font-size: 12px;
  color: var(--text-primary);
}

.variant-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.variant-readout {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 15px;
  font-weight: 600;
  color: var(--plm-accent);
}

.variant-caption {
  width: 100%;
  flex-basis: 100%;
  font-size: 11px;
  color: var(--text-muted);
}
</style>
