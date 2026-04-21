/**
 * iHomeNerd Bridge — Content Script
 *
 * Injected at document_start into allowed app origins.
 * Bridges window.postMessage from the page to the background service worker.
 *
 * Supports two protocols:
 * 1. Generic iHomeNerd bridge (ihomenerd-bridge-page / ihomenerd-bridge-extension)
 * 2. PronunCo legacy bridge (pronunco-local-bridge-page / pronunco-local-bridge-extension)
 */

// ---------------------------------------------------------------------------
// Protocol constants
// ---------------------------------------------------------------------------

// Generic iHomeNerd protocol
const IHN_PAGE_SOURCE = 'ihomenerd-bridge-page'
const IHN_EXTENSION_SOURCE = 'ihomenerd-bridge-extension'
const IHN_REQUEST_TYPE = 'ihomenerd-bridge/request'
const IHN_RESPONSE_TYPE = 'ihomenerd-bridge/response'
const IHN_READY_TYPE = 'ihomenerd-bridge/ready'

// PronunCo legacy protocol
const PC_PAGE_SOURCE = 'pronunco-local-bridge-page'
const PC_EXTENSION_SOURCE = 'pronunco-local-bridge-extension'
const PC_REQUEST_TYPE = 'pronunco-local-bridge/request'
const PC_RESPONSE_TYPE = 'pronunco-local-bridge/response'
const PC_READY_TYPE = 'pronunco-local-bridge/ready'

// ---------------------------------------------------------------------------
// Runtime message helper
// ---------------------------------------------------------------------------
function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      if (!response) {
        reject(new Error('Extension bridge did not return a response'))
        return
      }

      if (!response.ok) {
        const error = new Error(response.error || 'Extension bridge request failed')
        error.code = response.errorCode
        reject(error)
        return
      }

      resolve(response.payload)
    })
  })
}

function postToPage(payload) {
  window.postMessage(payload, window.location.origin || '*')
}

// ---------------------------------------------------------------------------
// Announce readiness on both protocols
// ---------------------------------------------------------------------------
postToPage({
  source: IHN_EXTENSION_SOURCE,
  type: IHN_READY_TYPE,
})

postToPage({
  source: PC_EXTENSION_SOURCE,
  type: PC_READY_TYPE,
})

// ---------------------------------------------------------------------------
// Message listener — handles both protocols
// ---------------------------------------------------------------------------
window.addEventListener('message', async (event) => {
  if (event.source !== window) return

  const data = event.data
  if (!data || typeof data !== 'object') return

  // --- Generic iHomeNerd protocol ---
  if (data.source === IHN_PAGE_SOURCE && data.type === IHN_REQUEST_TYPE && typeof data.requestId === 'string') {
    try {
      const payload = await sendRuntimeMessage(data.payload)
      postToPage({
        source: IHN_EXTENSION_SOURCE,
        type: IHN_RESPONSE_TYPE,
        requestId: data.requestId,
        ok: true,
        payload,
      })
    } catch (error) {
      postToPage({
        source: IHN_EXTENSION_SOURCE,
        type: IHN_RESPONSE_TYPE,
        requestId: data.requestId,
        ok: false,
        error: error instanceof Error ? error.message : 'Extension bridge request failed',
        errorCode: error?.code,
      })
    }
    return
  }

  // --- PronunCo legacy protocol ---
  if (data.source === PC_PAGE_SOURCE && data.type === PC_REQUEST_TYPE && typeof data.requestId === 'string') {
    try {
      const payload = await sendRuntimeMessage(data.payload)
      postToPage({
        source: PC_EXTENSION_SOURCE,
        type: PC_RESPONSE_TYPE,
        requestId: data.requestId,
        ok: true,
        payload,
      })
    } catch (error) {
      postToPage({
        source: PC_EXTENSION_SOURCE,
        type: PC_RESPONSE_TYPE,
        requestId: data.requestId,
        ok: false,
        error: error instanceof Error ? error.message : 'Extension bridge request failed',
        errorCode: error?.code,
      })
    }
    return
  }
})
