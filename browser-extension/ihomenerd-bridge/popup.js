/**
 * iHomeNerd Bridge — Popup UI
 *
 * Shows active brain, discovery results, manual config, diagnostics.
 */

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const activeBrainDisplay = document.getElementById('active-brain-display')
const testResult = document.getElementById('test-result')
const btnTest = document.getElementById('btn-test')
const btnScan = document.getElementById('btn-scan')
const brainListEl = document.getElementById('brain-list')
const emptyState = document.getElementById('empty-state')
const scanningIndicator = document.getElementById('scanning-indicator')
const scanningText = document.getElementById('scanning-text')
const toggleManualBtn = document.getElementById('toggle-manual')
const manualSection = document.getElementById('manual-section')
const manualUrlInput = document.getElementById('manual-url')
const btnManualSave = document.getElementById('btn-manual-save')
const diagSection = document.getElementById('diag-section')
const diagContent = document.getElementById('diag-content')
const versionLabel = document.getElementById('version-label')
const progressFill = document.getElementById('progress-fill')

// ---------------------------------------------------------------------------
// Bridge message helper
// ---------------------------------------------------------------------------
function sendBridge(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (!response) {
        reject(new Error('No response from background'))
        return
      }
      if (!response.ok) {
        reject(new Error(response.error || 'Bridge request failed'))
        return
      }
      resolve(response.payload)
    })
  })
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/$/, '')
}

function permissionPatternFor(baseUrl) {
  const url = new URL(normalizeBaseUrl(baseUrl))
  return `${url.protocol}//${url.host}/*`
}

// ---------------------------------------------------------------------------
// Render active brain
// ---------------------------------------------------------------------------
function renderActiveBrain(brain) {
  if (!brain || !brain.url) {
    activeBrainDisplay.innerHTML = `
      <div class="empty-state" style="padding:6px 0;">
        No brain selected yet. Scan your LAN or enter an address below.
      </div>`
    btnTest.disabled = true
    return
  }

  btnTest.disabled = false
  const gpu = brain.gpu ? `${brain.gpu.name} (${Math.round(brain.gpu.vram_mb / 1024)}GB)` : ''
  const models = Array.isArray(brain.models) && brain.models.length > 0
    ? brain.models.join(', ')
    : ''

  activeBrainDisplay.innerHTML = `
    <div class="brain-item selected" style="cursor:default;margin:0;">
      <div class="brain-dot online"></div>
      <div class="brain-info">
        <div class="brain-name">${escapeHtml(brain.hostname || 'Brain')}</div>
        <div class="brain-url">${escapeHtml(brain.url)}</div>
        ${gpu || models ? `<div class="brain-meta">${escapeHtml([gpu, models].filter(Boolean).join(' — '))}</div>` : ''}
      </div>
    </div>`
}

// ---------------------------------------------------------------------------
// Render discovered brain list
// ---------------------------------------------------------------------------
let discoveredBrains = []
let selectedBrainUrl = ''

function renderBrainList() {
  if (discoveredBrains.length === 0) {
    brainListEl.classList.add('hidden')
    emptyState.classList.remove('hidden')
    return
  }

  emptyState.classList.add('hidden')
  brainListEl.classList.remove('hidden')
  brainListEl.innerHTML = ''

  for (const brain of discoveredBrains) {
    const isSelected = normalizeBaseUrl(brain.url) === normalizeBaseUrl(selectedBrainUrl)
    const li = document.createElement('li')

    const gpu = brain.gpu ? `${brain.gpu.name}` : ''
    const ollamaStatus = brain.ollama ? 'Ollama ready' : 'Ollama offline'
    const modelCount = Array.isArray(brain.models) ? `${brain.models.length} models` : ''
    const meta = [gpu, ollamaStatus, modelCount].filter(Boolean).join(' · ')

    li.innerHTML = `
      <div class="brain-item${isSelected ? ' selected' : ''}" data-url="${escapeAttr(brain.url)}">
        <div class="brain-dot ${brain.ollama ? 'online' : 'unknown'}"></div>
        <div class="brain-info">
          <div class="brain-name">${escapeHtml(brain.hostname || brain.ip || 'Brain')}</div>
          <div class="brain-url">${escapeHtml(brain.url)}</div>
          <div class="brain-meta">${escapeHtml(meta)}</div>
        </div>
        <button class="brain-select-btn ${isSelected ? 'active' : ''}">${isSelected ? 'Active' : 'Use'}</button>
      </div>`

    const selectBtn = li.querySelector('.brain-select-btn')
    if (!isSelected) {
      selectBtn.addEventListener('click', () => selectBrain(brain))
    }

    brainListEl.appendChild(li)
  }
}

// ---------------------------------------------------------------------------
// Select a brain
// ---------------------------------------------------------------------------
async function selectBrain(brain) {
  const url = normalizeBaseUrl(brain.url)

  // Request permission first
  try {
    const pattern = permissionPatternFor(url)
    const granted = await chrome.permissions.request({ origins: [pattern] })
    if (!granted) {
      showDiag('warn', `Permission denied for ${url}. You need to allow access to connect.`)
      return
    }
  } catch (err) {
    showDiag('err', `Permission error: ${err.message}`)
    return
  }

  try {
    await sendBridge({
      kind: 'ihomenerd-bridge/select-brain',
      url: url,
    })

    selectedBrainUrl = url
    const selected = await sendBridge({ kind: 'ihomenerd-bridge/get-config' })
    renderActiveBrain(selected.selectedBrain)
    renderBrainList()
    showDiag('ok', `Connected to ${brain.hostname || url}`)
  } catch (err) {
    showDiag('err', err.message)
  }
}

// ---------------------------------------------------------------------------
// Scan LAN
// ---------------------------------------------------------------------------
let isScanning = false
let progressPollId = null

function startProgressPoll() {
  stopProgressPoll()
  progressPollId = setInterval(async () => {
    try {
      // Try session storage first, fall back to local
      let data
      try {
        data = await chrome.storage.session.get('ihomenerd.scanProgress')
      } catch {
        data = await chrome.storage.local.get('ihomenerd.scanProgress')
      }
      const progress = data['ihomenerd.scanProgress']
      if (progress) {
        const pct = progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0
        if (progressFill) progressFill.style.width = `${pct}%`
        if (progress.found > 0) {
          scanningText.textContent = `Found ${progress.found} brain${progress.found > 1 ? 's' : ''}! Finishing scan... (${pct}%)`
        } else {
          scanningText.textContent = `Scanning your network... ${progress.scanned}/${progress.total} IPs (${pct}%)`
        }
      }
    } catch { /* ignore */ }
  }, 400)
}

function stopProgressPoll() {
  if (progressPollId) {
    clearInterval(progressPollId)
    progressPollId = null
  }
}

async function scanLAN() {
  if (isScanning) return
  isScanning = true

  btnScan.disabled = true
  scanningIndicator.classList.remove('hidden')
  emptyState.classList.add('hidden')
  brainListEl.classList.add('hidden')
  scanningText.textContent = 'Requesting network access...'
  if (progressFill) progressFill.style.width = '0%'

  // Request permission to access LAN IPs — needed for discovery probes.
  // The manifest only grants permanent access to localhost and .local hosts.
  try {
    const granted = await chrome.permissions.request({
      origins: ['http://*/*', 'https://*/*'],
    })
    if (!granted) {
      scanningIndicator.classList.add('hidden')
      showDiag('warn', 'Network access denied. The extension needs permission to scan your LAN for iHomeNerd brains.')
      isScanning = false
      btnScan.disabled = false
      return
    }
  } catch (err) {
    // Permission request failed (e.g., not in user gesture context)
    // Continue anyway — some hosts may still work with existing permissions
  }

  scanningText.textContent = 'Starting scan...'

  // Poll for progress updates from background
  startProgressPoll()

  try {
    const result = await sendBridge({ kind: 'ihomenerd-bridge/discover' })
    discoveredBrains = result.brains || []

    stopProgressPoll()

    if (discoveredBrains.length === 0) {
      scanningIndicator.classList.add('hidden')
      emptyState.classList.remove('hidden')
      emptyState.innerHTML = `
        No iHomeNerd brains found on your network.<br><br>
        <strong>Try entering the address manually below.</strong><br>
        <span style="font-size:11px;color:#6b7280;">
          Example: https://msi-raider-linux.local:17777<br>
          or: https://192.168.0.206:17777
        </span>`
      // Auto-expand manual entry section
      manualSection.classList.remove('hidden')
      manualUrlInput.focus()
      showDiag('info', 'Scan checked ' + (result._scannedCount || '~1000') + ' IPs. If iHomeNerd is running, try the manual address above. Common issues: browser may need network permissions granted, or the HTTPS cert may not be trusted yet.')
    } else {
      scanningIndicator.classList.add('hidden')

      // If one was auto-selected, refresh
      const config = await sendBridge({ kind: 'ihomenerd-bridge/get-config' })
      if (config.selectedBrain) {
        selectedBrainUrl = config.selectedBrain.url || ''
        renderActiveBrain(config.selectedBrain)
      }

      renderBrainList()

      // Auto-request permission for single discovered brain
      if (discoveredBrains.length === 1 && !selectedBrainUrl) {
        await selectBrain(discoveredBrains[0])
      }
    }
  } catch (err) {
    stopProgressPoll()
    scanningIndicator.classList.add('hidden')
    showDiag('err', `Scan failed: ${err.message}`)
  } finally {
    isScanning = false
    btnScan.disabled = false
  }
}

// ---------------------------------------------------------------------------
// Manual URL entry
// ---------------------------------------------------------------------------
async function saveManualUrl() {
  const url = normalizeBaseUrl(manualUrlInput.value)
  if (!url) {
    showDiag('warn', 'Enter a valid URL first.')
    return
  }

  // Validate URL format
  try {
    new URL(url)
  } catch {
    showDiag('err', 'Invalid URL format. Example: https://192.168.0.206:17777')
    return
  }

  const brain = {
    url,
    hostname: '',
    ip: '',
    ollama: false,
  }

  await selectBrain(brain)
}

// ---------------------------------------------------------------------------
// Test connection
// ---------------------------------------------------------------------------
async function testConnection() {
  testResult.classList.remove('hidden')
  testResult.className = 'status-box status-info'
  testResult.textContent = 'Testing...'
  btnTest.disabled = true

  try {
    const result = await sendBridge({
      kind: 'ihomenerd-bridge/probe',
      path: '/health',
      timeoutMs: 5000,
    })

    if (result.ok) {
      const body = result.body || {}
      const lines = [
        `Connected to ${body.product || 'iHomeNerd'} v${body.version || '?'}`,
        `Ollama: ${body.ollama ? 'ready' : 'not running'}`,
      ]
      if (body.models && Object.keys(body.models).length > 0) {
        lines.push(`Models: ${Object.keys(body.models).join(', ')}`)
      }
      if (body.hostname) {
        lines.push(`Host: ${body.hostname}`)
      }
      testResult.className = 'status-box status-ok'
      testResult.textContent = lines.join('\n')
    } else {
      testResult.className = 'status-box status-err'
      testResult.textContent = `Brain responded with error (${result.status})\n${JSON.stringify(result.body, null, 2)}`
    }
  } catch (err) {
    testResult.className = 'status-box status-err'
    testResult.textContent = err.message
  } finally {
    btnTest.disabled = false
  }
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------
function showDiag(level, message) {
  diagSection.classList.remove('hidden')
  diagContent.className = `status-box status-${level}`
  diagContent.textContent = message
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
async function init() {
  // Show version
  versionLabel.textContent = `v${chrome.runtime.getManifest().version}`

  // Load current config
  try {
    const config = await sendBridge({ kind: 'ihomenerd-bridge/get-config' })
    selectedBrainUrl = config.selectedBrain ? config.selectedBrain.url : ''
    renderActiveBrain(config.selectedBrain)

    // Load cached discovered brains
    const brainsResult = await sendBridge({ kind: 'ihomenerd-bridge/get-brains' })
    discoveredBrains = brainsResult.discovered || []
    renderBrainList()

    // Show permission state in diagnostics if no brain
    if (!selectedBrainUrl) {
      showDiag('info', 'No brain configured. Click "Scan LAN" to find your iHomeNerd.')
    } else if (!config.permissionGranted) {
      showDiag('warn', `Permission not granted for ${selectedBrainUrl}. Click "Test Connection" to grant access.`)
    }
  } catch (err) {
    showDiag('err', `Failed to load config: ${err.message}`)
  }
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
btnScan.addEventListener('click', () => void scanLAN())
btnTest.addEventListener('click', () => void testConnection())
btnManualSave.addEventListener('click', () => void saveManualUrl())

manualUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') void saveManualUrl()
})

toggleManualBtn.addEventListener('click', () => {
  manualSection.classList.toggle('hidden')
  if (!manualSection.classList.contains('hidden')) {
    manualUrlInput.focus()
  }
})

void init()
