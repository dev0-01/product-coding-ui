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
import { reactive, computed, onMounted } from "vue";
import CodingForm from "../components/coding-form.vue";
import { useCodingConfig } from "../composables/use-coding-config.js";

const CONFIG_NAME = "material";

const { fields, groups, previewConfig, loading, error, loadConfig } =
  useCodingConfig(CONFIG_NAME);

const selections = reactive({});
const textFields = reactive({ description: "" });
const MATERIAL_SEQUENCE = "0001";

const descriptionField = {
  id: "description",
  label: "Description",
  required: false,
  type: "text",
  group: "technical",
  options: [],
};

const displayGroups = computed(() => {
  if (
    groups.value.some((group) =>
      group.fields?.some((field) => field.id === "description"),
    )
  ) {
    return groups.value;
  }

  if (!groups.value.length) {
    return [
      {
        id: "technical",
        label: "Technical",
        accent: "#64748b",
        fields: [descriptionField],
      },
    ];
  }

  const lastGroupIndex = groups.value.length - 1;
  return groups.value.map((group, index) => {
    if (index !== lastGroupIndex) return group;
    return {
      ...group,
      fields: [...(group.fields || []), descriptionField],
    };
  });
});

const materialFieldIds = computed(() => ({
  partAssembly: findFieldId(
    ["partAssembly", "part_assembly", "partOrAssembly"],
    ["part / assembly", "part assembly"],
  ),
  productFamily: findFieldId(
    ["productFamily", "productFamilyGroup", "product"],
    ["product family"],
  ),
  model: findFieldId(["model", "productModel"], ["model"]),
  class: findFieldId(["class", "materialClass"], ["class"]),
  subClass: findFieldId(
    ["subClass", "subclass", "sub_class", "materialSubClass"],
    ["sub class", "sub-class"],
  ),
}));

const generatedCode = computed(() => {
  const prefix = partAssemblyPrefix();
  const materialCode = materialPathPreviewCode();

  if (!prefix) return "";
  return `${prefix}${materialCode}-${MATERIAL_SEQUENCE}`;
});

const codeSegments = computed(() => {
  const prefix = partAssemblyPrefix();
  const leafFieldId = materialLeafFieldId();
  const materialCode = materialPathPreviewCode();
  const leafField = fields.value.find((field) => field.id === leafFieldId);
  const firstSegment = `${prefix || "_"}${materialCode}`;
  const firstFilled = Boolean(prefix);

  return [
    {
      text: firstSegment,
      fieldId: leafFieldId,
      type: "field",
      filled: firstFilled,
      group: leafField?.group || null,
      label: leafField?.label || "Sub-class",
      accentColor: groupAccent(leafField?.group),
    },
    { text: "-", fieldId: null, type: "separator", filled: true },
    {
      text: MATERIAL_SEQUENCE,
      fieldId: "__materialSequence__",
      type: "field",
      filled: firstFilled,
      group: null,
      label: "Sequence",
      accentColor: "#64748b",
    },
  ];
});

const generatedDescription = computed(() => {
  const format = previewConfig.value?.descriptionFormat || [];
  const descriptionKeys = format.length
    ? format
    : fields.value
        .filter((field) => field.type !== "text")
        .map((field) => field.id);

  const description = descriptionKeys
    .map((key) => {
      const selectedDescription = selections[key]?.description;
      if (selectedDescription) return selectedDescription;
      if (key === "description")
        return formatDescription(textFields.description);
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (descriptionKeys.includes("description")) {
    return description;
  }

  const descriptionDetail = formatDescription(textFields.description);
  return [description, descriptionDetail].filter(Boolean).join(" ");
});

function formatDescription(raw) {
  const compact = String(raw ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!compact) return "";
  // if (/v$/i.test(compact)) {
  //   return compact.replace(/v$/i, 'V')
  // }
  return `${compact}`;
}

function findFieldId(idCandidates, labelCandidates) {
  const normalizedIds = idCandidates.map(normalizeKey);
  const byId = fields.value.find((field) =>
    normalizedIds.includes(normalizeKey(field.id)),
  );
  if (byId) return byId.id;

  const normalizedLabels = labelCandidates.map(normalizeText);
  const byLabel = fields.value.find((field) =>
    normalizedLabels.includes(normalizeText(field.label)),
  );
  return byLabel?.id || null;
}

function normalizeKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function selectedCode(fieldId) {
  if (!fieldId) return "";
  const selected = selections[fieldId];
  if (selected == null || selected === "") return "";
  if (typeof selected !== "object") return String(selected);
  const code = selected.code ?? selected.value;
  return code == null || code === "" ? "" : String(code);
}

function selectedDescription(fieldId) {
  if (!fieldId) return "";
  const selected = selections[fieldId];
  if (selected == null || selected === "") return "";
  if (typeof selected !== "object") return String(selected);
  return String(selected.description ?? selected.label ?? "").trim();
}

function partAssemblyPrefix() {
  const code = selectedCode(materialFieldIds.value.partAssembly);
  if (!code) return "";
  return code.charAt(0).toUpperCase();
}

function materialLeafFieldId() {
  return materialFieldIds.value.subClass || materialFieldIds.value.class;
}

function materialLeafCode() {
  const leafFieldId = materialLeafFieldId();
  const leafShortCode = selectedShortCode(leafFieldId);
  if (/^\d{5,}$/.test(leafShortCode)) return leafShortCode;

  const leafCode = selectedCode(leafFieldId);
  if (/^\d{5,}$/.test(leafCode)) return leafCode;

  const numericFromDescription =
    selectedDescription(leafFieldId).match(/\b\d{5}\b/);
  if (numericFromDescription) return numericFromDescription[0];

  const optionFullCode = selectedFullCode(leafFieldId);
  if (optionFullCode) return optionFullCode;

  return materialPathCode();
}

function materialPathCode() {
  const ids = materialFieldIds.value;
  const digits = [
    selectedPositionDigit(ids.productFamily, 0),
    selectedPositionDigit(ids.model, 1),
    selectedPositionDigit(ids.class, 2),
    selectedPositionDigit(ids.subClass, 3),
  ];

  if (digits.some((digit) => !digit)) return "";
  return `${digits.join("")}0`;
}

function materialPathPreviewCode() {
  const ids = materialFieldIds.value;
  const subClassDigit = selectedPositionDigit(ids.subClass, 3);
  return [
    selectedPositionDigit(ids.productFamily, 0) || "_",
    selectedPositionDigit(ids.model, 1) || "_",
    selectedPositionDigit(ids.class, 2) || "_",
    subClassDigit || "_",
    subClassDigit ? "0" : "_",
  ].join("");
}

function selectedPositionDigit(fieldId, position) {
  const candidates = [
    selectedFullCode(fieldId),
    selectedShortCode(fieldId),
    selectedCode(fieldId),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const digits = String(candidate).replace(/\D/g, "");
    if (!digits) continue;
    return digits[position] || digits[digits.length - 1];
  }
  return "";
}

function selectedShortCode(fieldId) {
  if (!fieldId) return "";
  const selected = selections[fieldId];
  if (!selected || typeof selected !== "object") return "";
  const shortCode = selected.shortCode;
  return shortCode == null || shortCode === "" ? "" : String(shortCode);
}

function selectedFullCode(fieldId) {
  if (!fieldId) return "";
  const selected = selections[fieldId];
  if (!selected || typeof selected !== "object") return "";

  const values = [
    selected.fullCode,
    selected.materialCode,
    selected.value,
    selected.label,
    selected.description,
  ];

  for (const value of values) {
    const match = String(value ?? "").match(/\b\d{5}\b/);
    if (match) return match[0];
  }
  return "";
}

function groupAccent(groupId) {
  const group = groups.value.find((item) => item.id === groupId);
  return group?.accent || "#3b82f6";
}

function normalizeSelectedOption(val) {
  if (val == null || val === "") return null;
  if (typeof val !== "object") return val;
  const raw = val.code ?? val.value;
  if (raw == null || raw === "") return null;
  const code = String(raw);
  const description = val.description ?? val.label ?? "";
  const shortCode = val.shortCode != null ? String(val.shortCode) : code;
  return { code, description, shortCode };
}

function onSelectionChange({ fieldId, value }) {
  selections[fieldId] =
    value && typeof value === "object"
      ? normalizeSelectedOption(value)
      : value || null;
}

function onFreeText({ fieldId, value }) {
  textFields[fieldId] = value;
}

function clearSelections() {
  for (const key of Object.keys(selections)) {
    selections[key] = null;
  }
  textFields.description = "";
}

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.coding-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
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
