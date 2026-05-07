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
      <div class="coding-form-sheet">
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
      <div class="plm-panel plm-panel-inset code-output-panel">
        <div class="panel-body code-output-inner">
          <p class="code-output-caption">Generated code</p>
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
      <div v-for="group in groups" :key="group.id" class="plm-panel plm-panel-inset">
       

        <div class="panel-body panel-fields panel-fields-grid">
          <div
            v-for="field in group.fields"
            :key="field.id"
            class="field-row"
            :class="{ 'field-row-span': field.type === 'variantButton' }"
          >
            <div class="field-label-row">
              <label :for="field.id" class="field-label">
                {{ field.label }}
                <span v-if="field.required" class="field-required">*</span>
              </label>
              <template v-if="field.type === 'select'">
                <button
                  v-if="cascadeParentHint(field)"
                  type="button"
                  class="field-cascade-trigger"
                  v-tooltip.top="cascadeParentHint(field)"
                  :aria-label="cascadeParentHint(field)"
                >
                  <i class="pi pi-info-circle" aria-hidden="true"></i>
                </button>
                <span v-else class="field-cascade-spacer" aria-hidden="true" />
              </template>
            </div>

            <template v-if="field.type === 'select'">
            <Select
              :key="selectInstanceKey(group, field)"
              :id="field.id"
              size="small"
              :modelValue="selections[field.id]"
              @update:modelValue="onFieldChange(field.id, $event)"
              :options="field.options"
              optionLabel="description"
              dataKey="code"
              :placeholder="`Select ${field.label}`"
              class="field-select"
              :disabled="isCascadeBlocked(field)"
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

            <div
              v-if="showOptionCodes && selections[field.id]"
              class="field-hint"
            >
              <i class="pi pi-check-circle"></i>
              <span>{{ selections[field.id].code }} &middot; {{ selections[field.id].description }}</span>
            </div>
            </template>

            <InputText
              v-else-if="field.type === 'text'"
              :id="field.id"
              size="small"
              class="field-input"
              :placeholder="field.label"
              :modelValue="freeTextSelections[field.id] ?? ''"
              @update:modelValue="onFreeText(field.id, $event)"
            />

            <div v-else-if="field.type === 'variantButton'" class="variant-field">
              <!-- Rev 2 (slide 16): single action — increment trailing segment; no decrement in spec -->
              <div
                v-if="variantIncrementOnly"
                class="variant-rev2"
                role="group"
                :aria-label="`${field.label} — advance counter`"
              >
                <div class="variant-rev2-main">
                  <div class="variant-readout mono" aria-live="polite">
                    {{ paddedVariant }}
                  </div>
                  <button
                    type="button"
                    class="plm-btn plm-btn-primary variant-bump-btn"
                    @click="$emit('increment-variant')"
                  >
                    <i class="pi pi-plus"></i>
                    Next variant
                  </button>
                </div>
                <p class="variant-doc-hint" role="note">
                  Each click increases the trailing segment (e.g. 001 → 002). Use Reset All Fields to restore 001.
                </p>
              </div>
              <div
                v-else
                class="variant-stepper"
                role="group"
                :aria-label="`${field.label} counter`"
              >
                <button
                  type="button"
                  class="variant-stepper-btn"
                  aria-label="Decrease variant"
                  :disabled="!variantStepActive"
                  @click="$emit('decrement-variant')"
                >
                  <i class="pi pi-minus"></i>
                </button>
                <span class="variant-stepper-value mono">{{ paddedVariant }}</span>
                <button
                  type="button"
                  class="variant-stepper-btn"
                  aria-label="Increase variant"
                  @click="$emit('increment-variant')"
                >
                  <i class="pi pi-plus"></i>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- ── Bottom toolbar (Material / fallback) ── -->
      <div v-if="toolbarPlacement === 'bottom' && hasAnySelection" class="plm-toolbar plm-toolbar-bottom">
        <button class="plm-btn plm-btn-outline" @click="$emit('clear')">
          <i class="pi pi-refresh"></i> Reset All Fields
        </button>
      </div>
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
  hierarchyRelations: { type: Object, default: null },
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
  /** Rev 2: variant dropdown replaced by increment-only button (no − control). */
  variantIncrementOnly: { type: Boolean, default: false },
  showOptionCodes: { type: Boolean, default: true },
})

const emit = defineEmits([
  'update:selection',
  'update:freetext',
  'clear',
  'retry',
  'acknowledge',
  'increment-variant',
  'decrement-variant',
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

function findFieldLabel(fieldId) {
  if (!fieldId) return ''
  for (const g of props.groups) {
    const f = g.fields?.find((x) => x.id === fieldId)
    if (f?.label) return f.label
  }
  return ''
}

function parentFieldForCascade(field) {
  const h = props.hierarchyRelations
  if (!h || field.type !== 'select') return null
  const edge = h[field.id]
  return edge?.parentField ?? null
}

function isCascadeBlocked(field) {
  const pid = parentFieldForCascade(field)
  if (!pid) return false
  const sel = props.selections[pid]
  return sel == null || sel === ''
}

function cascadeParentHint(field) {
  if (!isCascadeBlocked(field)) return ''
  const pid = parentFieldForCascade(field)
  const parentLbl = findFieldLabel(pid)
  if (parentLbl) {
    return `Select ${parentLbl} first to choose ${field.label}.`
  }
  return `Select the parent field above before choosing ${field.label}.`
}

function onFieldChange(fieldId, value) {
  emit('update:selection', { fieldId, value })
}

/**
 * Remount only when the *parent* cascade path changes — not when options[] is rebuilt
 * (same length), so the first open/click is not interrupted by destroying the Select.
 */
function selectInstanceKey(group, field) {
  const s = props.selections
  if (field.id === 'series') {
    return `${group.id}-${field.id}`
  }
  const p =
    field.id === 'model'
      ? String(s.series?.code ?? s.series?.value ?? '')
      : field.id === 'class'
        ? `${s.series?.code ?? ''}|${s.model?.code ?? ''}`
        : field.id === 'subClass'
          ? `${s.series?.code ?? ''}|${s.model?.code ?? ''}|${s.class?.code ?? ''}`
          : ''
  return `${group.id}-${field.id}-${p}`
}

function onFreeText(fieldId, value) {
  emit('update:freetext', { fieldId, value })
}
</script>

<style scoped>
.coding-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Raised shell: separates form from page background */
.coding-form-sheet {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px 20px 14px;
  box-sizing: border-box;
  width: 100%;
  max-width: 560px;
  margin-left: auto;
  margin-right: auto;
  background: var(--surface-card, #fff);
  border: 1px solid rgba(27, 42, 74, 0.09);
  border-radius: 12px;
  box-shadow: var(--shadow-sheet, var(--shadow-panel-raised));
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

.plm-panel-inset {
  box-shadow: none;
  border-radius: var(--radius-lg, 6px);
  background: var(--surface-section, #f6f8fa);
  border: 1px solid #e1e6ec;
}

.code-output-panel.plm-panel-inset {
  background: linear-gradient(
    165deg,
    #e8edf3 0%,
    #f6f9fc 48%,
    #fafcfd 100%
  );
  border-color: #d2dae3;
}

.code-output-caption {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted, #8b939c);
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
  padding: 10px 14px;
}

.panel-body.code-output-inner {
  padding: 6px 12px 6px;
  background: transparent;
}

/* ── Code Character Display ── */
.code-display {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  flex-wrap: wrap;
  padding: 0 0 4px;
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
  width: 22px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Consolas', 'Courier New', monospace;
  font-weight: 600;
  font-size: 11px;
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
  padding-top: 3px;
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
  gap: 8px;
  padding: 3px 0 4px;
  border-bottom: 1px solid var(--surface-border-light, #dee2e6);
}

.output-row:last-child {
  border-bottom: none;
}

.output-key {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted, #8b939c);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 82px;
  flex-shrink: 0;
}

.output-val {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #1a1d21);
}

.output-val.mono {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  letter-spacing: 0.04em;
}

.val-empty {
  font-weight: 400;
  color: var(--text-muted, #8b939c);
}

/* ── Field rows: grid of sections; each cell stacks label → control → hints vertically ── */
.panel-fields {
  padding: 0;
}

.panel-fields-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0px;
  align-items: start;
}

@media (max-width: 560px) {
  .panel-fields-grid {
    grid-template-columns: 1fr;
  }
}

.field-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  min-width: 0;
  padding: 7px 9px;
  border: 1px solid rgba(27, 42, 74, 0.08);
  border-radius: var(--radius-md, 4px);
  background: var(--surface-card, #fff);
  box-shadow: none;
  transition: border-color 0.15s ease;
}

.field-row:hover {
  border-color: color-mix(in srgb, var(--plm-accent, #005685) 28%, var(--surface-border-light));
}

.field-row-span {
  grid-column: 1 / -1;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 1px;
  min-height: 28px;
}

.field-label-row .field-label {
  flex: 1;
  min-width: 0;
}

.field-cascade-trigger {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: -2px -4px 0 0;
  padding: 0;
  border: none;
  border-radius: var(--radius-md, 4px);
  color: var(--plm-accent, #005685);
  background: transparent;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}

.field-cascade-trigger:hover {
  background: var(--plm-accent-light, #e8f4fc);
  color: var(--plm-accent-hover, #003d5c);
}

.field-cascade-trigger:focus-visible {
  outline: 2px solid var(--plm-accent, #005685);
  outline-offset: 1px;
}

.field-cascade-trigger i {
  font-size: 15px;
}

/* Keeps label row height aligned when only some fields show the info control */
.field-cascade-spacer {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  margin: -2px -4px 0 0;
  pointer-events: none;
}

.field-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted, #8b939c);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
  line-height: 1.2;
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
  gap: 4px;
  font-size: 11px;
  color: var(--color-success, #1e7e34);
  margin-top: 0;
}

.field-hint i {
  font-size: 11px;
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
  font-size: 11px;
  color: var(--plm-accent, #005685);
  background: var(--plm-accent-light, #e8f4fc);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  min-width: 32px;
  text-align: center;
}

.opt-desc {
  color: var(--text-primary, #1a1d21);
  font-size: 11px;
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
  padding: 0 0 6px;
  margin: 0;
  border-bottom: 1px solid var(--surface-border-light, #dee2e6);
  background: transparent;
  box-shadow: none;
}

.plm-toolbar-bottom {
  padding: 10px 0 0;
  margin: 4px 0 0;
  border-top: 1px solid var(--surface-border-light, #dee2e6);
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
  font-size: 11px;
}

/* Denser PrimeVue controls — small typography; compact trigger icons */
.field-row :deep(.p-select),
.field-row :deep(.p-inputtext) {
  width: 100%;
  min-width: 0;
  font-size: 11px;
  margin-top: 0;
}

.field-row :deep(.p-select .p-select-label) {
  flex: 1;
  min-width: 0;
  padding-block: 0.22rem;
  font-size: 11px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.field-row :deep(.p-inputtext) {
  padding-block: 0.22rem;
  font-size: 11px;
  min-height: 2.125rem;
  box-sizing: border-box;
}

.field-row :deep(.p-select .p-select-dropdown) {
  width: 1.75rem;
  min-width: 1.75rem;
}

.field-row :deep(.p-select .p-select-dropdown-icon) {
  width: 0.7rem;
  height: 0.7rem;
}

.field-row :deep(.p-select .p-select-dropdown svg) {
  width: 0.7rem !important;
  height: 0.7rem !important;
}

.field-row :deep(.p-select .p-select-clear-icon) {
  width: 0.7rem;
  height: 0.7rem;
}

.field-row :deep(.p-select .p-select-clear-icon svg) {
  width: 0.65rem !important;
  height: 0.65rem !important;
}

/* One-line selects: same closed height with or without value / clear icon */
.field-row :deep(.p-select.p-inputwrapper) {
  display: inline-flex;
  align-items: center;
  min-height: 2.125rem;
  max-height: 2.125rem;
}

.field-row :deep(.p-select .opt-desc-only) {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-row :deep(.p-select .opt-item) {
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.field-row :deep(.p-select .opt-item .opt-desc) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opt-desc-only {
  font-size: 11px;
  color: var(--text-primary);
}

.variant-field {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.variant-rev2 {
  width: 100%;
}

.variant-rev2-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.variant-readout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4rem;
  padding: 6px 11px;
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  color: var(--plm-accent, #005685);
  background: var(--plm-accent-light, #e8f4fc);
  border: 1px solid color-mix(in srgb, var(--plm-accent, #005685) 25%, transparent);
  border-radius: var(--radius-md, 4px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.variant-bump-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
}

.variant-doc-hint {
  margin: 5px 0 0;
  max-width: 100%;
  font-size: 10px;
  line-height: 1.35;
  color: var(--text-muted, #8b939c);
}

.variant-stepper {
  display: inline-flex;
  align-items: stretch;
  height: 32px;
  border: 1px solid var(--surface-border-light, #dee2e6);
  border-radius: var(--radius-md, 4px);
  overflow: hidden;
  background: var(--surface-card, #fff);
  box-shadow: 0 1px 2px rgba(27, 42, 74, 0.04);
}

.variant-stepper-btn {
  width: 32px;
  min-width: 32px;
  padding: 0;
  margin: 0;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-section, #f4f6f8);
  color: var(--text-secondary, #5a6570);
  cursor: pointer;
  transition: background 0.12s ease;
}

.variant-stepper-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--plm-accent-light, #e8f4fc) 85%, var(--surface-section));
  color: var(--plm-accent, #005685);
}

.variant-stepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.variant-stepper-btn i {
  font-size: 12px;
}

.variant-stepper-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
  padding: 0 8px;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--plm-accent, #005685);
  border-left: 1px solid var(--surface-border-light, #dee2e6);
  border-right: 1px solid var(--surface-border-light, #dee2e6);
  background: var(--surface-card, #fff);
}
</style>
