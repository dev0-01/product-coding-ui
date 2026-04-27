import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Vite dev plugin: parses key=value coding config files and serves them at
 * /ArgeDashRest/api/coding-config/{name} as JSON.
 *
 * Resolution order for {name}:
 *   1. {EXTERNAL_DIR}/{name}.properties  (default C:/argePLM, override with
 *                                         ARGEPLM_CODING_DIR env var)
 *   2. {LOCAL_DIR}/{name}.cfg            (./config, fallback for portability)
 *
 * This matches the Spring Boot CodingConfigService so dev and production read
 * from the SAME file. End users edit C:/argePLM/{name}.properties and a
 * browser refresh shows the change immediately - no rebuild, no restart.
 */
function codingConfigDevPlugin() {
  const EXTERNAL_DIR = process.env.ARGEPLM_CODING_DIR || 'C:/argePLM'
  const LOCAL_DIR = path.resolve(__dirname, 'config')
  const META_KEYS = new Set([
    'screenType',
    'screenTitle',
    'fieldOrder',
    'fieldLabels',
    'fieldRequired',
    'fieldGroups',
    'groupOrder',
    'groupLabels',
    'groupAccents',
    'groupTags',
    'codeFormat',
    'codeSeparator',
    'descriptionFormat',
  ])

  function loadProps(name) {
    const candidates = [
      path.join(EXTERNAL_DIR, `${name}.properties`),
      path.join(LOCAL_DIR, `${name}.cfg`),
    ]
    const file = candidates.find((p) => fs.existsSync(p))
    if (!file) return null
    const text = fs.readFileSync(file, 'utf-8')
    const props = {}
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      const value = line.slice(eq + 1).trim()
      props[key] = value
    }
    return props
  }

  const splitTrimmed = (v) =>
    !v ? [] : v.split(',').map((s) => s.trim()).filter(Boolean)

  const parsePipeMap = (v) => {
    const map = {}
    if (!v) return map
    for (const entry of v.split(',')) {
      const [k, ...rest] = entry.split('|')
      if (rest.length) map[k.trim()] = rest.join('|').trim()
    }
    return map
  }

  function buildResponse(props) {
    const fieldOrder = splitTrimmed(props.fieldOrder)
    const labelMap = parsePipeMap(props.fieldLabels)
    const groupMap = parsePipeMap(props.fieldGroups)
    const requiredSet = new Set(splitTrimmed(props.fieldRequired))

    const fields = fieldOrder.map((id) => {
      const optionsStr = props[id] || ''
      const options = optionsStr
        .split(',')
        .map((entry) => {
          const [value, ...rest] = entry.split('|')
          return rest.length ? { value: value.trim(), label: rest.join('|').trim() } : null
        })
        .filter(Boolean)
      return {
        name: id,
        label: labelMap[id] || id,
        required: requiredSet.has(id),
        type: 'select',
        group: groupMap[id] || 'default',
        options,
      }
    })

    const groupOrder = splitTrimmed(props.groupOrder)
    const groupLabelMap = parsePipeMap(props.groupLabels)
    const groupAccentMap = parsePipeMap(props.groupAccents)
    const groupTagMap = parsePipeMap(props.groupTags)

    const groups = groupOrder.map((id) => {
      const g = {
        id,
        label: groupLabelMap[id] || id,
        accent: groupAccentMap[id] || '#3b82f6',
      }
      if (groupTagMap[id]) g.tag = groupTagMap[id]
      return g
    })

    return {
      screenType: props.screenType || '',
      screenTitle: props.screenTitle || '',
      fields,
      groups,
      preview: {
        codeFormat: splitTrimmed(props.codeFormat),
        codeSeparator: props.codeSeparator || '-',
        descriptionFormat: splitTrimmed(props.descriptionFormat),
      },
    }
  }

  return {
    name: 'coding-config-dev',
    configureServer(server) {
      const PREFIX = '/ArgeDashRest/api/coding-config/'
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith(PREFIX)) return next()
        const name = req.url.slice(PREFIX.length).split('?')[0].replace(/\/$/, '')
        const props = loadProps(name)
        if (!props) {
          res.statusCode = 404
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: `Config '${name}' not found` }))
          return
        }
        res.setHeader('content-type', 'application/json')
        res.setHeader('cache-control', 'no-store, must-revalidate')
        res.setHeader('pragma', 'no-cache')
        res.end(JSON.stringify(buildResponse(props)))
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), codingConfigDevPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/ArgeDashRest': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
    },
  },
})
