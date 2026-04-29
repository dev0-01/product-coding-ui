# product-coding-ui

A Vue 3 + Vite frontend for the **ArGe PLM Coding** screens (Product Coding,
Material Coding, ...). Every field, label, option, group, code format and
description format is defined in a `.properties` file on disk. The frontend
itself contains **zero** hardcoded business data - it just fetches the config,
renders the form, and shows the generated code and description live as the
user picks values.

End users edit the property files at `C:\argePLM\` and a browser refresh shows
the change immediately. No rebuild, no restart.

---

## 1. Stack

| Layer | Tech |
| --- | --- |
| UI framework | Vue 3 (`<script setup>`) |
| Build tool / dev server | Vite 8 |
| Component library | PrimeVue 4 (Aura theme) + PrimeIcons |
| Routing | vue-router 5 |
| HTTP client | axios |

Backend (separate repo, `arge-plm-integration-onprem`):

- Spring Boot service exposing `GET /ArgeDashRest/api/coding-config/{name}`
- Reads the same `.properties` files this UI consumes

---

## 2. Prerequisites

- **Node.js 18+** and npm
- The Spring Boot backend (`arge-plm-integration-onprem`) running on
  `http://localhost:8083` - it serves the coding config to this UI
- A coding config folder on disk (default `C:\argePLM\`) containing
  `product.properties`, `material.properties`, etc. - the backend reads
  these at request time

---

## 3. Quick start

```bash
# 1. Start the Spring Boot backend on :8083
#    (separate repo: arge-plm-integration-onprem)

# 2. Start the UI
git clone <this-repo>
cd product-coding-ui
npm install
npm run dev          # http://localhost:5173
```

The UI calls `/ArgeDashRest/api/coding-config/{name}`, Vite's `server.proxy`
forwards that to the backend on :8083, and the backend reads
`C:\argePLM\<name>.properties` from disk and returns JSON. If the backend
isn't running you'll see the form's error/retry state - that's expected.

### Available scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Vite dev server with HMR on port 5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally for smoke-testing |

---

## 4. How it all wires together

```
+-------------------------+    1. GET /ArgeDashRest/api/coding-config/product
|   Browser - Vue app     | -----------------------------------------------+
|                         |                                                |
|  product-coding-view    |                                                v
|     |                   |     +------------------------------------------+
|     v                   |     | Vite dev server (npm run dev) on :5173   |
|  use-coding-config  --->|     |                                          |
|     |                   |     |   server.proxy forwards                  |
|     v                   |     |   /ArgeDashRest/* -> http://localhost:8083
|  coding-form.vue        |     +-----------------------+------------------+
|     +  groups/fields    |                             |
|     +  selected values  |                             v
|     v                   |     +------------------------------------------+
|  use-code-generator     |     | Spring Boot backend on :8083             |
|     |  codeSegments     |     |                                          |
|     |  generatedCode    |     |   CodingConfigService                    |
|     |  generatedDesc    |     |     1. read C:/argePLM/product.properties|
|     v                   |     |        (external, user-editable)         |
|  live preview shown     |     |     2. fall back to classpath if missing |
+-------------------------+     |     3. parse key=value -> JSON           |
                                |   CodingConfigController                 |
                                |     return JSON with no-store headers    |
                                +------------------------------------------+
```

### The data flow in one sentence

A view declares a config name (`'product'`), `useCodingConfig` fetches the
backend config for that name, the response drives `coding-form.vue` (groups,
fields, options, labels, required flags), the user's selections feed
`useCodeGenerator`, and the generated code + description re-render reactively
as selections change.

---

## 5. The `.properties` config format

Each screen is one file: `C:\argePLM\<name>.properties`. Lines starting with
`#` are comments. Keys are simple `key=value`. Values use `,` to separate
list items and `|` to separate `code|label` pairs.

### Meta keys

| Key | Meaning | Example |
| --- | --- | --- |
| `screenType` | Identifier for the screen | `product` |
| `screenTitle` | Title text | `Product Coding` |
| `fieldOrder` | Comma-separated list of field IDs, in render order | `series,model,class,subClass,variant` |
| `fieldLabels` | `fieldId\|UI Label` pairs | `series\|Product Series,model\|Model` |
| `fieldRequired` | Comma-separated list of required field IDs | `series,model,class` |
| `fieldGroups` | `fieldId\|groupId` pairs | `series\|tree,model\|tree,variant\|configuration` |
| `groupOrder` | Comma-separated list of group IDs, in render order | `tree,configuration` |
| `groupLabels` | `groupId\|Group Label` pairs | `tree\|Product Tree` |
| `groupAccents` | `groupId\|#hex` color used for the segment chip | `tree\|#3b82f6` |
| `groupTags` | `groupId\|tag text` shown as a small badge (optional) | `tree\|Auto` |
| `codeFormat` | Field IDs that compose the generated code (in order) | `series,model,class,subClass,variant` |
| `codeSeparator` | Character placed between code segments | `-` |
| `descriptionFormat` | Field IDs whose option labels build the description | `series,model,class,variant` |

### Per-field options

For each field listed in `fieldOrder`, define a key with the field's ID whose
value is a comma-separated list of `code|description` pairs:

```properties
series=1610|Battery,1710|Energy,1810|Power
model=001|Residential,002|Industrial,003|Commercial,004|Mobile
```

### Full minimal example

```properties
screenType=product
screenTitle=Product Coding

fieldOrder=series,model,class
fieldLabels=series|Product Series,model|Model,class|Class
fieldRequired=series,model,class
fieldGroups=series|tree,model|tree,class|tree

groupOrder=tree
groupLabels=tree|Product Tree
groupAccents=tree|#3b82f6

codeFormat=series,model,class
codeSeparator=-
descriptionFormat=series,model,class

series=1610|Battery,1710|Energy
model=001|Residential,002|Industrial
class=001|Stackable,002|Fixed
```

---

## 6. The API contract

`GET /ArgeDashRest/api/coding-config/{name}` returns:

```json
{
  "screenType": "product",
  "screenTitle": "Product Coding",
  "fields": [
    {
      "name": "series",
      "label": "Product Series",
      "required": true,
      "type": "select",
      "group": "tree",
      "options": [{ "value": "1610", "label": "Battery" }]
    }
  ],
  "groups": [
    { "id": "tree", "label": "Product Tree", "accent": "#3b82f6", "tag": "Auto" }
  ],
  "preview": {
    "codeFormat": ["series", "model", "class"],
    "codeSeparator": "-",
    "descriptionFormat": ["series", "model", "class"]
  }
}
```

The Vite dev plugin and the Spring Boot service produce the **same** JSON, so
the frontend code never has to know which one is serving it.

---

## 7. Where the config comes from at runtime

The Spring Boot service (`CodingConfigService`) resolves a config name in
this order on every request:

1. `${argeplm.coding.dir}/<name>.properties` (default `C:/argePLM`,
   overridable via `application.properties` or the `ARGEPLM_CODING_DIR`
   env var) - the **external, user-editable** copy
2. `classpath:/<name>.properties` - bundled fallback inside the JAR, used
   on a fresh install where the external folder doesn't exist yet

If neither exists, the API returns `404`.

The same backend serves both dev (via the Vite proxy) and production, so
there is **one source of truth** for config: the file on disk read by
Spring Boot at request time.

---

## 8. Editing configs at runtime (no rebuild, no restart)

This is the whole point of the architecture. The workflow is:

1. Open `C:\argePLM\product.properties` in any text editor.
2. Change a label, add an option, reorder fields, add a new group, ...
3. Save.
4. Refresh the browser tab.

You're done. No `npm run build`, no Vite restart, no Spring Boot restart.

The frontend defeats browser cache by appending a `?_t=<timestamp>` query
param to every fetch and the backend sends `Cache-Control: no-store`, so a
plain refresh is enough - no need for hard-reload.


---

## 9. Adding a new coding screen (e.g. "Tooling")

1. Create the config:
   ```
   C:\argePLM\tooling.properties
   ```
   Use the format from section 5.

2. Create the view file `src/views/tooling-coding-view.vue`. Easiest path -
   copy `product-coding-view.vue` and change one line:
   ```js
   const CONFIG_NAME = 'tooling'
   ```

3. Register the route in `src/routes.js`:
   ```js
   import ToolingCodingView from './views/tooling-coding-view.vue'

   export const routes = [
     // ... existing routes
     { path: '/tooling-coding', name: 'ToolingCoding', component: ToolingCodingView },
   ]
   ```

4. (Optional) Add a nav item in `src/components/app-header.vue`.

That's the full list. No fields, options, or labels are written in code.

---

## 10. Project layout

```
product-coding-ui/
├── config/                          local-only fallback configs (.cfg)
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── api/
│   │   └── coding-config-api.js     axios call to /api/coding-config/{name}
│   ├── components/
│   │   ├── app-header.vue           top bar / breadcrumbs / nav
│   │   └── coding-form.vue          generic grouped form + segmented preview
│   ├── composables/
│   │   ├── use-coding-config.js     fetches + structures the backend config
│   │   └── use-code-generator.js    builds code + description from selections
│   ├── views/
│   │   ├── product-coding-view.vue  requests "product"
│   │   └── material-coding-view.vue requests "material"
│   ├── App.vue
│   ├── main.js
│   ├── routes.js
│   └── style.css
├── index.html
├── package.json
├── vite.config.js                   includes codingConfigDevPlugin + proxy
└── README.md
```

### File naming convention

- Vue files (components, views), composables and JS modules use **kebab-case**
  filenames.
- The exported symbols inside those files keep idiomatic JS / Vue casing:
  PascalCase for components (`CodingForm`, `AppHeader`, `ProductCodingView`),
  camelCase for composables (`useCodingConfig`, `useCodeGenerator`) and route
  names (`ProductCoding`, `MaterialCoding`).
- The single exception is `App.vue`, which keeps the conventional Vue root
  filename.

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `404 Request failed with status code 404` on the screen | The config name in the view doesn't match a file in `C:\argePLM\` | Rename either side so they match. The view's `CONFIG_NAME` looks for `<CONFIG_NAME>.properties`. |
| `Network Error` / `ECONNREFUSED` on the screen | Spring Boot backend isn't running on port 8083 | Start `arge-plm-integration-onprem` first, then refresh the UI. |
| Edits to `C:\argePLM\<name>.properties` don't show after refresh | Browser served a cached page | Hard refresh once (Ctrl+Shift+R). After that, the cache-busting query param keeps it fresh. |
| `Failed to resolve import "../components/CodingForm.vue"` | Old import path referencing PascalCase filename | Make sure all imports use kebab-case (`coding-form.vue`, `use-coding-config.js`, etc.). |
| `npm run build` complains about missing imports | Same as above, but reachable only at build time | Same fix - check imports in any newly added view. |
| Two HMR reloads then a blank page | The dev plugin returned 200 but with malformed JSON, usually because the `.properties` file has a syntax error | Open the properties file, check for stray characters, missing `|`, or unclosed comma lists. |

---

## 12. License & ownership

Internal ArGe PLM project. See repository owner for license terms.
