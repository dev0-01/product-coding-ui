# product-coding-ui

A Vue 3 + Vite frontend that renders **Product Coding** and **Material Coding**
screens entirely from a backend config API. No hardcoded fields, labels, or
options live in the frontend - it only fetches the config, renders the form,
combines selected values, and displays the live code/description preview.

## Architecture

| Concern | Owner | Notes |
| --- | --- | --- |
| Field list, labels, required flags, groups, options | Backend config | Returned by `GET /ArgeDashRest/api/coding-config/{name}` |
| Code format / description format | Backend config | `preview.codeFormat`, `preview.descriptionFormat` |
| Render & combine selected values | Frontend | Generic, reused for every screen |

The same Vue component (`CodingForm.vue`) drives both the Product and the
Material screens - they differ only in which config name they request.

## API contract

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
    "codeFormat": ["series", "model", "class", "subClass", "variant"],
    "codeSeparator": "-",
    "descriptionFormat": ["series", "model", "class", "variant"]
  }
}
```

In production this endpoint is implemented by the Spring Boot service
`CodingConfigController` reading `*.properties` files. During local development
a tiny Vite middleware (see `vite.config.js`) parses the `.cfg` files in
`./config/` and serves the same JSON shape - so you can run the UI without
having to start the Java backend.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server serves config from `./config/*.cfg`. To point at the real
Spring Boot backend instead, just start it on `localhost:8083` and remove or
disable the `codingConfigDevPlugin()` entry in `vite.config.js` - the existing
`/ArgeDashRest` proxy will take over.

## Adding a new coding screen

1. Add a `.cfg` (or `.properties` on the backend) describing fields, groups,
   `codeFormat` and `descriptionFormat`.
2. Add a route in `src/routes.js` pointing at a thin view that calls
   `useCodingConfig('your-config-name')`.

No frontend code changes are needed for new fields, options, or label edits -
just update the config.

## Project layout

```
src/
  api/configApi.js           - axios call to /api/coding-config/{name}
  composables/
    useCodingConfig.js       - loads + structures the backend config
    useCodeGenerator.js      - builds code segments + description from selections
  components/
    CodingForm.vue           - generic vertical form + segmented code preview
    AppHeader.vue            - top bar / nav
  views/
    ProductCodingView.vue    - requests "product-coding"
    MaterialCodingView.vue   - requests "material-coding"
config/
  product-coding.cfg         - dev mock for product screen
  material-coding.cfg        - dev mock for material screen
```
