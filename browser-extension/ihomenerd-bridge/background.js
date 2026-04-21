/**
 * iHomeNerd Bridge — Background Service Worker
 *
 * Handles:
 * 1. Generic iHomeNerd bridge relay (ihomenerd-bridge/*)
 * 2. PronunCo legacy compatibility shim (pronunco-local-bridge/*)
 * 3. LAN brain auto-discovery (subnet scan on port 17777)
 * 4. Brain storage and permission management
 */

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
const STORAGE_KEY_SELECTED_BRAIN = 'ihomenerd.selectedBrain'       // { url, hostname, ... }
const STORAGE_KEY_DISCOVERED_BRAINS = 'ihomenerd.discoveredBrains' // [ { url, hostname, ... } ]

// PronunCo legacy key — kept in sync with selected brain for compat
const STORAGE_KEY_PRONUNCO_BASE_URL = 'pronuncoLocalBridge.baseUrl'

const DEFAULT_PORT = 17777
const DISCOVERY_TIMEOUT_MS = 2500
const REQUEST_DEFAULT_TIMEOUT_MS = 3000

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function normalizeBaseUrl(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  return trimmed.replace(/\/$/, '')
}

function isLoopbackUrl(baseUrl) {
  try {
    const url = new URL(baseUrl)
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost'
  } catch {
    return false
  }
}

function isPrivateNetworkUrl(baseUrl) {
  try {
    const url = new URL(baseUrl)
    const h = url.hostname
    if (h === '127.0.0.1' || h === 'localhost') return true
    if (h.endsWith('.local')) return true
    // RFC 1918
    const parts = h.split('.')
    if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
      const a = parseInt(parts[0])
      const b = parseInt(parts[1])
      if (a === 10) return true
      if (a === 172 && b >= 16 && b <= 31) return true
      if (a === 192 && b === 168) return true
    }
    return false
  } catch {
    return false
  }
}

function permissionPatternFor(baseUrl) {
  const url = new URL(normalizeBaseUrl(baseUrl))
  return `${url.protocol}//${url.host}/*`
}

async function hasPermission(baseUrl) {
  try {
    const pattern = permissionPatternFor(baseUrl)
    return await chrome.permissions.contains({ origins: [pattern] })
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Brain storage
// ---------------------------------------------------------------------------
async function getSelectedBrain() {
  const data = await chrome.storage.local.get(STORAGE_KEY_SELECTED_BRAIN)
  return data[STORAGE_KEY_SELECTED_BRAIN] || null
}

async function setSelectedBrain(brain) {
  await chrome.storage.local.set({
    [STORAGE_KEY_SELECTED_BRAIN]: brain,
    // Keep PronunCo legacy key in sync
    [STORAGE_KEY_PRONUNCO_BASE_URL]: brain ? brain.url : '',
  })
  updateBadge(brain)
  return brain
}

async function getSelectedBrainUrl() {
  const brain = await getSelectedBrain()
  return brain ? normalizeBaseUrl(brain.url) : ''
}

async function getDiscoveredBrains() {
  const data = await chrome.storage.local.get(STORAGE_KEY_DISCOVERED_BRAINS)
  return data[STORAGE_KEY_DISCOVERED_BRAINS] || []
}

async function setDiscoveredBrains(brains) {
  await chrome.storage.local.set({
    [STORAGE_KEY_DISCOVERED_BRAINS]: brains,
  })
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
function updateBadge(brain) {
  if (brain && brain.url) {
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' })
    chrome.action.setBadgeText({ text: '' })
    chrome.action.setTitle({ title: `iHomeNerd Bridge — ${brain.hostname || brain.url}` })
  } else {
    chrome.action.setBadgeBackgroundColor({ color: '#9ca3af' })
    chrome.action.setBadgeText({ text: '?' })
    chrome.action.setTitle({ title: 'iHomeNerd Bridge — no brain selected' })
  }
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------
async function readJsonResponse(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

async function fetchBrainJson(options) {
  const {
    baseUrl,
    path,
    method = 'GET',
    body,
    timeoutMs = REQUEST_DEFAULT_TIMEOUT_MS,
  } = options

  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path || ''}`
  const targetUrl = `${normalizeBaseUrl(baseUrl)}${normalizedPath}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const fetchInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    }
    if (body !== undefined && body !== null) {
      fetchInit.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    const response = await fetch(targetUrl, fetchInit)
    return {
      ok: response.ok,
      status: response.status,
      baseUrl: normalizeBaseUrl(baseUrl),
      body: await readJsonResponse(response),
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

// ---------------------------------------------------------------------------
// Error formatting
// ---------------------------------------------------------------------------
function formatFetchHints(baseUrl) {
  const hints = []
  try {
    const url = new URL(normalizeBaseUrl(baseUrl))
    if (url.hostname.endsWith('.local')) {
      hints.push('If this .local hostname does not resolve, switch to the brain\'s IP address instead (e.g. https://192.168.0.206:17777).')
    }
    if (url.protocol === 'https:' && !isLoopbackUrl(baseUrl)) {
      hints.push(`If using a self-signed cert, open ${normalizeBaseUrl(baseUrl)}/setup in this browser first and install the trust certificate.`)
    }
  } catch { /* ignore */ }
  return hints
}

function formatError(error, baseUrl) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return baseUrl
      ? `Request timed out for ${normalizeBaseUrl(baseUrl)}`
      : 'Request timed out'
  }

  const message = error instanceof Error && error.message
    ? error.message
    : 'Bridge request failed'

  if ((message === 'Failed to fetch' || message === 'NetworkError when attempting to fetch resource.' || message === 'Load failed') && baseUrl) {
    const hints = formatFetchHints(baseUrl)
    return hints.length > 0
      ? 'Failed to fetch. ' + hints.join(' ')
      : 'Failed to fetch'
  }

  return message
}

// ---------------------------------------------------------------------------
// LAN Discovery
// ---------------------------------------------------------------------------

/**
 * Detect the local subnet from a known brain or common private ranges.
 * Returns an array of subnet prefixes to scan, e.g. ['192.168.0.', '192.168.1.']
 */
async function guessSubnets() {
  const prefixes = new Set()

  // From selected brain
  const brain = await getSelectedBrain()
  if (brain && brain.url) {
    try {
      const url = new URL(brain.url)
      const parts = url.hostname.split('.')
      if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
        prefixes.add(`${parts[0]}.${parts[1]}.${parts[2]}.`)
      }
    } catch { /* ignore */ }
  }

  // From previously discovered brains
  const discovered = await getDiscoveredBrains()
  for (const b of discovered) {
    try {
      const url = new URL(b.url)
      const parts = url.hostname.split('.')
      if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
        prefixes.add(`${parts[0]}.${parts[1]}.${parts[2]}.`)
      }
    } catch { /* ignore */ }
  }

  // Default common home subnets if we found nothing
  if (prefixes.size === 0) {
    prefixes.add('192.168.0.')
    prefixes.add('192.168.1.')
    prefixes.add('192.168.178.') // Fritz!Box default
    prefixes.add('10.0.0.')
  }

  return [...prefixes]
}

/**
 * Probe a single IP:port for an iHomeNerd brain.
 * Returns brain info or null.
 */
async function probeBrain(ip, port = DEFAULT_PORT) {
  // Try HTTPS first, then HTTP
  for (const protocol of ['https', 'http']) {
    const baseUrl = `${protocol}://${ip}:${port}`
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS)
      const response = await fetch(`${baseUrl}/discover`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      })
      clearTimeout(timeoutId)

      if (!response.ok) continue

      const data = await response.json()
      if (data && data.product === 'iHomeNerd') {
        return {
          url: baseUrl,
          hostname: data.hostname || ip,
          ip: ip,
          port: port,
          protocol: protocol,
          version: data.version || 'unknown',
          gpu: data.gpu || null,
          models: data.models || [],
          ollama: data.ollama || false,
          role: data.role || 'brain',
          discoveredAt: Date.now(),
        }
      }
    } catch {
      // Not reachable on this protocol, try next
    }
  }
  return null
}

/**
 * Scan local subnets for iHomeNerd brains.
 * Fires probes in parallel batches to avoid overwhelming the network.
 */
async function discoverBrains() {
  const subnets = await guessSubnets()
  const allIps = []

  for (const prefix of subnets) {
    for (let i = 1; i <= 254; i++) {
      allIps.push(`${prefix}${i}`)
    }
  }

  // Also probe .local hostnames if we know any
  const existing = await getDiscoveredBrains()
  const localHosts = new Set()
  for (const b of existing) {
    try {
      const url = new URL(b.url)
      if (url.hostname.endsWith('.local')) {
        localHosts.add(url.hostname)
      }
    } catch { /* ignore */ }
  }

  const brains = []
  const BATCH_SIZE = 30

  // Process in batches
  for (let i = 0; i < allIps.length; i += BATCH_SIZE) {
    const batch = allIps.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(ip => probeBrain(ip))
    )
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        brains.push(result.value)
      }
    }
  }

  // Also probe known .local hostnames
  for (const hostname of localHosts) {
    const result = await probeBrain(hostname).catch(() => null)
    if (result) {
      // Deduplicate by IP if we already found it by IP
      const isDupe = brains.some(b => b.ip === result.ip)
      if (!isDupe) brains.push(result)
    }
  }

  // Store discovered brains
  await setDiscoveredBrains(brains)

  // If no brain is selected and we found exactly one, auto-select it
  const selected = await getSelectedBrain()
  if (!selected && brains.length === 1) {
    await setSelectedBrain(brains[0])
  }

  return brains
}

// ---------------------------------------------------------------------------
// Generic iHomeNerd bridge message handler
// ---------------------------------------------------------------------------
async function handleIHomeNerdMessage(message) {
  const kind = message.kind

  // --- ping ---
  if (kind === 'ihomenerd-bridge/ping') {
    const brain = await getSelectedBrain()
    const brainUrl = brain ? brain.url : ''
    return {
      available: true,
      version: chrome.runtime.getManifest().version,
      product: 'iHomeNerd Bridge',
      selectedBrain: brain,
      permissionGranted: brainUrl ? await hasPermission(brainUrl) : false,
    }
  }

  // --- get-config ---
  if (kind === 'ihomenerd-bridge/get-config') {
    const brain = await getSelectedBrain()
    const brainUrl = brain ? brain.url : ''
    return {
      selectedBrain: brain,
      baseUrl: brainUrl,
      permissionPattern: brainUrl ? permissionPatternFor(brainUrl) : '',
      permissionGranted: brainUrl ? await hasPermission(brainUrl) : false,
    }
  }

  // --- set-config ---
  if (kind === 'ihomenerd-bridge/set-config') {
    const url = normalizeBaseUrl(message.baseUrl)
    if (!url) throw new Error('baseUrl is required')
    const brain = {
      url,
      hostname: message.hostname || '',
      ip: message.ip || '',
      port: DEFAULT_PORT,
      protocol: url.startsWith('https') ? 'https' : 'http',
      version: message.version || '',
      configuredAt: Date.now(),
    }
    await setSelectedBrain(brain)
    return {
      selectedBrain: brain,
      baseUrl: url,
      permissionPattern: permissionPatternFor(url),
    }
  }

  // --- discover ---
  if (kind === 'ihomenerd-bridge/discover') {
    return { brains: await discoverBrains() }
  }

  // --- get-brains ---
  if (kind === 'ihomenerd-bridge/get-brains') {
    return {
      selected: await getSelectedBrain(),
      discovered: await getDiscoveredBrains(),
    }
  }

  // --- select-brain ---
  if (kind === 'ihomenerd-bridge/select-brain') {
    const url = normalizeBaseUrl(message.url || message.baseUrl)
    if (!url) throw new Error('url is required')
    // Find in discovered list or create a minimal entry
    const discovered = await getDiscoveredBrains()
    const found = discovered.find(b => normalizeBaseUrl(b.url) === url)
    const brain = found || {
      url,
      hostname: '',
      ip: '',
      port: DEFAULT_PORT,
      protocol: url.startsWith('https') ? 'https' : 'http',
      version: '',
      configuredAt: Date.now(),
    }
    await setSelectedBrain(brain)
    return { selectedBrain: brain }
  }

  // --- request (generic relay) ---
  if (kind === 'ihomenerd-bridge/request') {
    const requestedUrl = normalizeBaseUrl(message.baseUrl || (await getSelectedBrainUrl()))
    if (!requestedUrl) {
      const error = new Error('No brain selected. Open the iHomeNerd Bridge popup to configure or discover a brain.')
      error.code = 'no_brain_selected'
      throw error
    }

    if (!isPrivateNetworkUrl(requestedUrl)) {
      const error = new Error('iHomeNerd Bridge only relays to local/LAN addresses')
      error.code = 'not_private_network'
      throw error
    }

    const granted = await hasPermission(requestedUrl)
    if (!granted) {
      const error = new Error(`Extension does not have permission to reach ${requestedUrl}. Open the iHomeNerd Bridge popup and grant access.`)
      error.code = 'permission_denied'
      throw error
    }

    return fetchBrainJson({
      baseUrl: requestedUrl,
      path: message.path,
      method: message.method,
      body: message.body,
      timeoutMs: message.timeoutMs,
    })
  }

  // --- probe ---
  if (kind === 'ihomenerd-bridge/probe') {
    const baseUrl = normalizeBaseUrl(message.baseUrl || (await getSelectedBrainUrl()))
    if (!baseUrl) {
      const error = new Error('No brain selected')
      error.code = 'no_brain_selected'
      throw error
    }

    const granted = await hasPermission(baseUrl)
    if (!granted) {
      const error = new Error(`Extension does not have permission to reach ${baseUrl}`)
      error.code = 'permission_denied'
      throw error
    }

    return fetchBrainJson({
      baseUrl,
      path: message.path || '/health',
      method: 'GET',
      timeoutMs: message.timeoutMs || 4000,
    })
  }

  throw new Error(`Unsupported bridge message kind: '${String(kind)}'`)
}

// ---------------------------------------------------------------------------
// PronunCo legacy compatibility shim
// ---------------------------------------------------------------------------
async function handlePronunCoLegacyMessage(message) {
  const kind = message.kind

  // --- ping ---
  if (kind === 'pronunco-local-bridge/ping') {
    const brainUrl = await getSelectedBrainUrl()
    return {
      available: true,
      version: chrome.runtime.getManifest().version,
      configuredBaseUrl: brainUrl,
      permissionGranted: brainUrl ? await hasPermission(brainUrl) : false,
    }
  }

  // --- get-config ---
  if (kind === 'pronunco-local-bridge/get-config') {
    const brainUrl = await getSelectedBrainUrl()
    return {
      baseUrl: brainUrl,
      permissionPattern: brainUrl ? permissionPatternFor(brainUrl) : '',
      permissionGranted: brainUrl ? await hasPermission(brainUrl) : false,
    }
  }

  // --- set-config ---
  if (kind === 'pronunco-local-bridge/set-config') {
    const url = normalizeBaseUrl(message.baseUrl)
    if (!url) throw new Error('baseUrl is required')
    await setSelectedBrain({
      url,
      hostname: '',
      ip: '',
      port: DEFAULT_PORT,
      protocol: url.startsWith('https') ? 'https' : 'http',
      version: '',
      configuredAt: Date.now(),
    })
    return {
      baseUrl: url,
      permissionPattern: permissionPatternFor(url),
    }
  }

  // --- request ---
  if (kind === 'pronunco-local-bridge/request') {
    const requestedUrl = normalizeBaseUrl(message.baseUrl || (await getSelectedBrainUrl()))
    if (!requestedUrl) {
      const error = new Error('No brain configured. Open the iHomeNerd Bridge popup to set up.')
      error.code = 'no_brain_selected'
      throw error
    }

    const granted = await hasPermission(requestedUrl)
    if (!granted) {
      const error = new Error(`Extension does not have permission to reach ${requestedUrl}`)
      error.code = 'permission_denied'
      throw error
    }

    return fetchBrainJson({
      baseUrl: requestedUrl,
      path: message.path,
      method: message.method,
      body: message.body,
      timeoutMs: message.timeoutMs,
    })
  }

  // --- probe ---
  if (kind === 'pronunco-local-bridge/probe') {
    const baseUrl = normalizeBaseUrl(message.baseUrl || (await getSelectedBrainUrl()))
    if (!baseUrl) {
      const error = new Error('No brain configured')
      error.code = 'no_brain_selected'
      throw error
    }

    const granted = await hasPermission(baseUrl)
    if (!granted) {
      const error = new Error(`Extension does not have permission to reach ${baseUrl}`)
      error.code = 'permission_denied'
      throw error
    }

    return fetchBrainJson({
      baseUrl,
      path: message.path || '/health',
      method: 'GET',
      timeoutMs: message.timeoutMs || 4000,
    })
  }

  throw new Error(`Unsupported legacy bridge message: '${String(kind)}'`)
}

// ---------------------------------------------------------------------------
// Message router — dispatches to generic or PronunCo handler
// ---------------------------------------------------------------------------
async function handleMessage(message) {
  if (!message || typeof message !== 'object' || !message.kind) {
    throw new Error('Invalid bridge message: missing kind')
  }

  const kind = message.kind
  if (kind.startsWith('ihomenerd-bridge/')) {
    return handleIHomeNerdMessage(message)
  }
  if (kind.startsWith('pronunco-local-bridge/')) {
    return handlePronunCoLegacyMessage(message)
  }

  throw new Error(`Unknown message kind: '${kind}'`)
}

// ---------------------------------------------------------------------------
// Listener
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const requestedBaseUrl = message && typeof message === 'object' && typeof message.baseUrl === 'string'
    ? normalizeBaseUrl(message.baseUrl)
    : undefined

  handleMessage(message)
    .then(payload => sendResponse({ ok: true, payload }))
    .catch(error => {
      sendResponse({
        ok: false,
        error: formatError(error, requestedBaseUrl),
        errorCode: error?.code,
      })
    })

  // Return true to keep sendResponse channel open for async
  return true
})

// ---------------------------------------------------------------------------
// Install / startup
// ---------------------------------------------------------------------------
chrome.runtime.onInstalled.addListener(async (details) => {
  // Migrate PronunCo legacy config if it exists and no brain is selected
  const data = await chrome.storage.local.get([
    STORAGE_KEY_SELECTED_BRAIN,
    STORAGE_KEY_PRONUNCO_BASE_URL,
  ])

  if (!data[STORAGE_KEY_SELECTED_BRAIN] && data[STORAGE_KEY_PRONUNCO_BASE_URL]) {
    const legacyUrl = normalizeBaseUrl(data[STORAGE_KEY_PRONUNCO_BASE_URL])
    if (legacyUrl) {
      await setSelectedBrain({
        url: legacyUrl,
        hostname: '',
        ip: '',
        port: DEFAULT_PORT,
        protocol: legacyUrl.startsWith('https') ? 'https' : 'http',
        version: '',
        migratedFrom: 'pronunco-local-bridge',
        configuredAt: Date.now(),
      })
    }
  }

  // Set initial badge state
  const brain = await getSelectedBrain()
  updateBadge(brain)
})

// On startup, refresh badge
chrome.runtime.onStartup?.addListener(async () => {
  const brain = await getSelectedBrain()
  updateBadge(brain)
})
