package com.ihomenerd.home.runtime

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo

object AndroidServiceAdvertiser {
    private const val SERVICE_TYPE = "_ihomenerd._tcp."

    private var registrationListener: NsdManager.RegistrationListener? = null

    fun start(context: Context, nodeName: String, port: Int, version: String) {
        val manager = context.getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return
        stop(context)

        val safeHost = nodeName.trim()
            .replace("[^A-Za-z0-9.-]".toRegex(), "-")
            .replace("-+".toRegex(), "-")
            .trim('-')
            .ifBlank { "android-node" }
            .lowercase()

        val serviceInfo = NsdServiceInfo().apply {
            serviceType = SERVICE_TYPE
            serviceName = "iHomeNerd on $safeHost"
            setPort(port)
            setAttribute("role", "brain")
            setAttribute("hostname", "$safeHost.local")
            setAttribute("version", version)
        }

        val listener = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(nsdServiceInfo: NsdServiceInfo) = Unit
            override fun onRegistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) = Unit
            override fun onServiceUnregistered(nsdServiceInfo: NsdServiceInfo) = Unit
            override fun onUnregistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) = Unit
        }

        registrationListener = listener
        runCatching {
            manager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, listener)
        }.onFailure {
            registrationListener = null
        }
    }

    fun stop(context: Context) {
        val manager = context.getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return
        val listener = registrationListener ?: return
        runCatching {
            manager.unregisterService(listener)
        }
        registrationListener = null
    }
}
