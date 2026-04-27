import axios from 'axios'

const BASE_URL = '/ArgeDashRest/api/coding-config'

/**
 * Fetches the full coding config from the backend.
 * Returns structured JSON with fields, groups, and preview patterns.
 *
 * The `_t` query parameter and explicit no-cache headers force the browser
 * (and any intermediate proxy) to bypass cache, so editing the properties
 * file in C:/argePLM and refreshing the page always shows the latest data.
 *
 * @param {string} configName - config identifier (e.g. 'product')
 * @returns {Promise<Object>} structured config
 */
export async function getCodingConfig(configName) {
  const response = await axios.get(`${BASE_URL}/${configName}`, {
    params: { _t: Date.now() },
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  })
  return response.data
}
