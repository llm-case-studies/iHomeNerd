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
const SETUP_PORT = 17778        // HTTP-only setup server (no TLS)
const DISCOVERY_TIMEOUT_MS = 2500

// Firefox MV3 CSP auto-upgrades all HTTP→HTTPS (upgrade-insecure-requests),
// making HTTP probes to the setup server (port 17778) silently fail.
const IS_FIREFOX = /Firefox\//.test(navigator.userAgent)
console.log('[iHN] IS_FIREFOX =', IS_FIREFOX, navigator.userAgent)
const REQUEST_DEFAULT_TIMEOUT_MS = 3000

// Progress tracking key (uses chrome.storage.session for ephemeral data)
const STORAGE_KEY_SCAN_PROGRESS = 'ihomenerd.scanProgress'

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

function isLoopbackBrain(brain) {
  if (!brain) return false
  if (brain.url && isLoopbackUrl(brain.url)) return true
  return brain.ip === '127.0.0.1' || brain.hostname === 'localhost'
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
 * Probe a single IP for an iHomeNerd brain.
 * Tries multiple port/protocol/endpoint combinations in parallel:
 *   - HTTP :17778 /discover, /setup/test  (no cert needed)
 *   - HTTPS :17777 /discover, /health     (needs trusted cert)
 * Uses Promise.any — first successful response wins.
 * Returns brain info or null.
 */
async function probeBrain(ip) {
  // Firefox CSP upgrades all HTTP→HTTPS, which breaks HTTP:17778 probes.
  // On Firefox, only probe the HTTPS endpoints.
  const probes = IS_FIREFOX ? [
    { protocol: 'https', port: DEFAULT_PORT, path: '/discover' },
    { protocol: 'https', port: DEFAULT_PORT, path: '/health' },
  ] : [
    { protocol: 'http',  port: SETUP_PORT,  path: '/discover' },
    { protocol: 'http',  port: SETUP_PORT,  path: '/setup/test' },
    { protocol: 'https', port: DEFAULT_PORT, path: '/discover' },
    { protocol: 'https', port: DEFAULT_PORT, path: '/health' },
  ]

  const probePromises = probes.map(async ({ protocol, port, path }) => {
    const url = `${protocol}://${ip}:${port}${path}`
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS)
    try {
      const r = await fetch(url, { signal: controller.signal, mode: 'cors', credentials: 'omit', headers: { 'Accept': 'application/json' } })
      clearTimeout(tid)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      if (!data || data.product !== 'iHomeNerd') throw new Error('not iHomeNerd')
      return data
    } catch (e) {
      clearTimeout(tid)
      throw e
    }
  })

  try {
    const data = await Promise.any(probePromises)
    return {
      url: `https://${ip}:${DEFAULT_PORT}`,
      hostname: data.hostname || ip,
      ip: ip,
      port: DEFAULT_PORT,
      protocol: 'https',
      version: data.version || 'unknown',
      gpu: data.gpu || null,
      models: data.models || [],
      ollama: data.ollama || false,
      role: data.role || 'brain',
      discoveredAt: Date.now(),
    }
  } catch {
    return null
  }
}

/**
 * Prioritize IPs: common router-assigned ranges first, then the rest.
 * This finds brains faster on typical home networks.
 */
function prioritizeIps(allIps) {
  // Common DHCP ranges that routers assign to devices
  const hotRanges = new Set()
  for (const ip of allIps) {
    const lastOctet = parseInt(ip.split('.').pop())
    // Common ranges: .1 (gateway), .100-.120, .200-.220, .2-.30
    if (lastOctet === 1 || (lastOctet >= 2 && lastOctet <= 30) ||
        (lastOctet >= 100 && lastOctet <= 120) ||
        (lastOctet >= 200 && lastOctet <= 220)) {
      hotRanges.add(ip)
    }
  }

  const hot = allIps.filter(ip => hotRanges.has(ip))
  const cold = allIps.filter(ip => !hotRanges.has(ip))
  return [...hot, ...cold]
}

/**
 * Write scan progress to storage so the popup can display it.
 */
async function updateScanProgress(scanned, total, found) {
  try {
    await chrome.storage.session.set({
      [STORAGE_KEY_SCAN_PROGRESS]: { scanned, total, found, ts: Date.now() },
    })
  } catch {
    // chrome.storage.session may not be available in older Firefox
    await chrome.storage.local.set({
      [STORAGE_KEY_SCAN_PROGRESS]: { scanned, total, found, ts: Date.now() },
    })
  }
}

/**
 * Scan local subnets for iHomeNerd brains.
 *
 * Discovery strategy (fastest-first):
 *   Phase 0: Probe localhost (loopback brain on this machine)
 *   Phase 1: Probe known .local hostnames (from previous discoveries)
 *   Phase 2: If any brain is reachable, ask it for mDNS peers via /discover/peers
 *   Phase 3: IP subnet scan (slow fallback, needs optional permissions)
 */
async function discoverBrains() {
  const brains = []
  const seenIps = new Set()

  function addBrain(brain) {
    if (!brain) return
    const key = brain.ip || brain.hostname
    if (seenIps.has(key)) return
    seenIps.add(key)
    brains.push(brain)
  }

  // Report initial progress
  await updateScanProgress(0, 1, 0)

  console.log('[iHN discover] Phase 0: probing localhost')
  // --- Phase 0: Probe localhost ---
  const localResult = await probeBrain('127.0.0.1').catch(e => { console.log('[iHN discover] localhost probe failed:', e.message); return null })
  addBrain(localResult)

  // --- Phase 1: Probe known .local hostnames (have permanent permission) ---
  const existing = await getDiscoveredBrains()
  const selected = await getSelectedBrain()
  const localHosts = new Set()

  console.log('[iHN discover] Phase 1: existing brains:', existing.length, 'selected:', selected?.url)

  // Collect .local hostnames from previous discoveries and selected brain
  for (const b of existing) {
    try {
      const url = new URL(b.url)
      if (url.hostname.endsWith('.local')) localHosts.add(url.hostname)
    } catch { /* ignore */ }
  }
  if (selected && selected.url) {
    try {
      const url = new URL(selected.url)
      if (url.hostname.endsWith('.local')) localHosts.add(url.hostname)
    } catch { /* ignore */ }
  }

  console.log('[iHN discover] Phase 1: .local hosts to probe:', [...localHosts])
  for (const hostname of localHosts) {
    const result = await probeBrain(hostname).catch(e => { console.log('[iHN discover] .local probe failed for', hostname, ':', e.message); return null })
    console.log('[iHN discover] Phase 1 probe result for', hostname, ':', result ? 'FOUND' : 'null')
    addBrain(result)
  }

  // --- Phase 1b: Probe the currently selected brain directly, even if it is an IP ---
  if (selected && selected.url) {
    try {
      const selectedHost = new URL(selected.url).hostname
      console.log('[iHN discover] Phase 1b: probing selected host', selectedHost)
      const result = await probeBrain(selectedHost).catch(e => {
        console.log('[iHN discover] selected probe failed for', selectedHost, ':', e.message)
        return null
      })
      addBrain(result)
    } catch { /* ignore invalid selected URL */ }
  }

  console.log('[iHN discover] After phase 1: brains found =', brains.length)
  await updateScanProgress(0, 1, brains.length)

  // --- Phase 2: Ask any reachable brain for mDNS peers ---
  if (brains.length > 0) {
    for (const brain of [...brains]) {
      try {
        // Try the HTTPS main port first, then HTTP setup port
        let peersData = null
        for (const baseUrl of [brain.url, `http://${brain.ip}:${SETUP_PORT}`]) {
          try {
            const controller = new AbortController()
            const tid = setTimeout(() => controller.abort(), 3000)
            const r = await fetch(`${baseUrl}/discover/peers`, {
              signal: controller.signal,
              headers: { 'Accept': 'application/json' },
            })
            clearTimeout(tid)
            if (r.ok) { peersData = await r.json(); break }
          } catch { /* try next */ }
        }
        if (peersData && Array.isArray(peersData.peers)) {
          for (const peer of peersData.peers) {
            // Probe each peer — use hostname.local which has permanent permission
            const peerHost = peer.hostname || peer.ip
            const result = await probeBrain(peerHost).catch(() => null)
            addBrain(result)
          }
        }
      } catch { /* ignore */ }
    }
  }

  await updateScanProgress(0, 1, brains.length)

  // --- Phase 3: IP subnet scan (LAN enumeration) ---
  // Run even if localhost or one known remote brain was found: users click
  // "Scan LAN" because they want the rest of the network, not just seeds.
  {
    const subnets = await guessSubnets()
    let allIps = []
    for (const prefix of subnets) {
      for (let i = 1; i <= 254; i++) {
        allIps.push(`${prefix}${i}`)
      }
    }
    allIps = prioritizeIps(allIps)

    const BATCH_SIZE = 50
    const totalIps = allIps.length
    await updateScanProgress(0, totalIps, 0)

    for (let i = 0; i < allIps.length; i += BATCH_SIZE) {
      const batch = allIps.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(ip => probeBrain(ip))
      )
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          addBrain(result.value)
        }
      }
      await updateScanProgress(Math.min(i + BATCH_SIZE, totalIps), totalIps, brains.length)
    }
  }

  // Prefer real LAN nodes before loopback-only results in the stored list.
  brains.sort((a, b) => {
    const aloop = isLoopbackBrain(a) ? 1 : 0
    const bloop = isLoopbackBrain(b) ? 1 : 0
    return aloop - bloop
  })

  // Final progress
  await updateScanProgress(1, 1, brains.length)

  // Store discovered brains
  await setDiscoveredBrains(brains)

  // If no brain is selected and we found exactly one, auto-select it
  const currentSelected = await getSelectedBrain()
  if (!currentSelected && brains.length === 1) {
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
