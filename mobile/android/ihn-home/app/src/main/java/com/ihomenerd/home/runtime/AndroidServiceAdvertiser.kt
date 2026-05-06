package com.ihomenerd.home.runtime

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class NsdRegistrationState(
    val attempted: Boolean = false,
    val currentlyRegistered: Boolean = false,
    val lifecycleState: String = "idle",
    val serviceType: String? = null,
    val serviceName: String? = null,
    val hostname: String? = null,
    val port: Int? = null,
    val lastErrorCode: Int? = null
)

object AndroidServiceAdvertiser {
    private const val SERVICE_TYPE = "_ihomenerd._tcp."

    private var registrationListener: NsdManager.RegistrationListener? = null
    
    private val _registrationState = MutableStateFlow(NsdRegistrationState())
    val registrationState: StateFlow<NsdRegistrationState> = _registrationState.asStateFlow()

    fun start(context: Context, nodeName: String, port: Int, version: String) {
        val manager = context.getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return
        stop(context)

        val safeHost = nodeName.trim()
            .replace("[^A-Za-z0-9.-]".toRegex(), "-")
            .replace("-+".toRegex(), "-")
            .trim('-')
            .ifBlank { "android-node" }
            .lowercase()

        val serviceNameStr = "iHomeNerd on $safeHost"

        _registrationState.update {
            it.copy(
                attempted = true,
                currentlyRegistered = false,
                lifecycleState = "registering",
                serviceType = SERVICE_TYPE,
                serviceName = serviceNameStr,
                hostname = "$safeHost.local",
                port = port,
                lastErrorCode = null
            )
        }

        val serviceInfo = NsdServiceInfo().apply {
            serviceType = SERVICE_TYPE
            serviceName = serviceNameStr
            setPort(port)
            setAttribute("role", "brain")
            setAttribute("hostname", "$safeHost.local")
            setAttribute("version", version)
        }

        val listener = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(nsdServiceInfo: NsdServiceInfo) {
                _registrationState.update {
                    it.copy(
                        currentlyRegistered = true,
                        lifecycleState = "registered",
                        serviceName = nsdServiceInfo.serviceName ?: it.serviceName
                    )
                }
            }
            override fun onRegistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                _registrationState.update {
                    it.copy(
                        currentlyRegistered = false,
                        lifecycleState = "registration_failed",
                        lastErrorCode = errorCode
                    )
                }
            }
            override fun onServiceUnregistered(nsdServiceInfo: NsdServiceInfo) {
                _registrationState.update {
                    it.copy(
                        currentlyRegistered = false,
                        lifecycleState = "unregistered"
                    )
                }
            }
            override fun onUnregistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                _registrationState.update {
                    it.copy(
                        currentlyRegistered = false,
                        lifecycleState = "unregistration_failed",
                        lastErrorCode = errorCode
                    )
                }
            }
        }

        registrationListener = listener
        runCatching {
            manager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, listener)
        }.onFailure {
            registrationListener = null
            _registrationState.update {
                it.copy(
                    currentlyRegistered = false,
                    lifecycleState = "registration_failed"
                )
            }
        }
    }

    fun stop(context: Context) {
        val manager = context.getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return
        val listener = registrationListener ?: return
        
        _registrationState.update {
            it.copy(lifecycleState = "unregistering")
        }
        
        runCatching {
            manager.unregisterService(listener)
        }
        registrationListener = null
        
        _registrationState.update {
            it.copy(
                currentlyRegistered = false,
                lifecycleState = "unregistered"
            )
        }
    }
}
