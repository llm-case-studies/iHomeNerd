package com.ihomenerd.home.runtime

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Build
import android.os.IBinder

class NodeRuntimeService : Service() {
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        LocalNodeRuntime.start(this)
        registerNetworkMonitoring()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> stopSelf()
            else -> LocalNodeRuntime.start(this)
        }
        return START_STICKY
    }

    override fun onDestroy() {
        unregisterNetworkMonitoring()
        LocalNodeRuntime.stop()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(): Notification {
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("iHomeNerd runtime")
            .setContentText("Serving local node APIs on :17777")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .build()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            CHANNEL_ID,
            "iHomeNerd runtime",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Foreground runtime for the local iHomeNerd Android node"
        }
        manager.createNotificationChannel(channel)
    }

    private fun registerNetworkMonitoring() {
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
        if (networkCallback != null) return
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                LocalNodeRuntime.handleNetworkChange(this@NodeRuntimeService)
            }

            override fun onLost(network: Network) {
                LocalNodeRuntime.handleNetworkChange(this@NodeRuntimeService)
            }

            override fun onCapabilitiesChanged(network: Network, networkCapabilities: NetworkCapabilities) {
                LocalNodeRuntime.handleNetworkChange(this@NodeRuntimeService)
            }

            override fun onLinkPropertiesChanged(network: Network, linkProperties: LinkProperties) {
                LocalNodeRuntime.handleNetworkChange(this@NodeRuntimeService)
            }
        }
        runCatching {
            manager.registerDefaultNetworkCallback(callback)
            networkCallback = callback
        }
    }

    private fun unregisterNetworkMonitoring() {
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
        val callback = networkCallback ?: return
        runCatching {
            manager.unregisterNetworkCallback(callback)
        }
        networkCallback = null
    }

    companion object {
        const val ACTION_START = "com.ihomenerd.home.runtime.START"
        const val ACTION_STOP = "com.ihomenerd.home.runtime.STOP"
        private const val CHANNEL_ID = "ihn-runtime"
        private const val NOTIFICATION_ID = 17777

        fun start(context: Context) {
            val intent = Intent(context, NodeRuntimeService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, NodeRuntimeService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }
}
