package com.ihomenerd.home.ui

import android.app.Application
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.ihomenerd.home.data.GatewayFetchException
import com.ihomenerd.home.data.GatewaySnapshot
import com.ihomenerd.home.data.IhnGatewayRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class IhnHomeUiState(
    val draftBaseUrl: String = "",
    val connectedBaseUrl: String = "",
    val travelModeEnabled: Boolean = false,
    val isLoading: Boolean = false,
    val snapshot: GatewaySnapshot? = null,
    val errorMessage: String? = null,
    val lastUpdatedLabel: String? = null
)

class IhnHomeViewModel(application: Application) : AndroidViewModel(application) {
    private val prefs = application.getSharedPreferences("ihn-home", 0)
    private val repository = IhnGatewayRepository()

    private val _uiState = MutableStateFlow(
        IhnHomeUiState(
            draftBaseUrl = prefs.getString(KEY_BASE_URL, defaultBaseUrl()) ?: defaultBaseUrl(),
            connectedBaseUrl = prefs.getString(KEY_BASE_URL, defaultBaseUrl()) ?: defaultBaseUrl(),
            travelModeEnabled = prefs.getBoolean(KEY_TRAVEL_MODE, false)
        )
    )
    val uiState: StateFlow<IhnHomeUiState> = _uiState

    init {
        refresh()
    }

    fun updateDraftBaseUrl(value: String) {
        _uiState.update { it.copy(draftBaseUrl = value) }
    }

    fun connect() {
        val normalized = repository.normalizeBaseUrl(_uiState.value.draftBaseUrl)
        prefs.edit().putString(KEY_BASE_URL, normalized).apply()
        _uiState.update { it.copy(draftBaseUrl = normalized, connectedBaseUrl = normalized) }
        refreshFor(normalized)
    }

    fun setGatewayFromExternal(raw: String) {
        val normalized = repository.normalizeBaseUrl(raw)
        if (normalized.isBlank()) return
        prefs.edit().putString(KEY_BASE_URL, normalized).apply()
        _uiState.update { it.copy(draftBaseUrl = normalized, connectedBaseUrl = normalized) }
        refreshFor(normalized)
    }

    fun setTravelModeEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_TRAVEL_MODE, enabled).apply()
        _uiState.update { it.copy(travelModeEnabled = enabled) }
    }

    fun refresh() {
        refreshFor(repository.normalizeBaseUrl(_uiState.value.draftBaseUrl))
    }

    private fun refreshFor(baseUrl: String) {
        if (baseUrl.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Enter a gateway URL to start.", snapshot = null) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null, connectedBaseUrl = baseUrl) }
            try {
                val snapshot = withContext(Dispatchers.IO) {
                    repository.load(baseUrl)
                }
                _uiState.update { current ->
                    if (current.connectedBaseUrl != baseUrl) return@update current
                    current.copy(
                        isLoading = false,
                        snapshot = snapshot,
                        errorMessage = snapshot.warnings.firstOrNull(),
                        lastUpdatedLabel = "Updated now"
                    )
                }
            } catch (exc: GatewayFetchException) {
                _uiState.update { current ->
                    if (current.connectedBaseUrl != baseUrl) return@update current
                    current.copy(
                        isLoading = false,
                        snapshot = null,
                        errorMessage = exc.message,
                        lastUpdatedLabel = null
                    )
                }
            } catch (exc: Exception) {
                _uiState.update { current ->
                    if (current.connectedBaseUrl != baseUrl) return@update current
                    current.copy(
                        isLoading = false,
                        snapshot = null,
                        errorMessage = exc.message ?: exc.javaClass.simpleName,
                        lastUpdatedLabel = null
                    )
                }
            }
        }
    }

    private fun defaultBaseUrl(): String {
        val runningInEmulator = Build.FINGERPRINT.contains("generic", ignoreCase = true) ||
            Build.MODEL.contains("Emulator", ignoreCase = true) ||
            Build.MODEL.contains("sdk", ignoreCase = true)
        return if (runningInEmulator) {
            "http://10.0.2.2:17778"
        } else {
            "http://127.0.0.1:17778"
        }
    }

    companion object {
        private const val KEY_BASE_URL = "gateway_base_url"
        private const val KEY_TRAVEL_MODE = "travel_mode_enabled"
    }
}
