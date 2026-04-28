package com.ihomenerd.home

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.core.content.ContextCompat
import com.ihomenerd.home.runtime.NodeRuntimeService
import com.ihomenerd.home.ui.IhnHomeApp
import com.ihomenerd.home.ui.theme.IhnTheme

class MainActivity : ComponentActivity() {
    private val recordAudioPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ensureRecordAudioPermission()
        if (intent?.getBooleanExtra("start_local_runtime", false) == true) {
            NodeRuntimeService.start(applicationContext)
        }
        val initialGatewayUrl = intent?.getStringExtra("gateway_url")
            ?: if (intent?.getBooleanExtra("start_local_runtime", false) == true) {
                "http://127.0.0.1:${com.ihomenerd.home.runtime.LocalNodeRuntime.SETUP_PORT}"
            } else {
                null
            }
        setContent {
            IhnTheme {
                IhnHomeApp(initialGatewayUrl = initialGatewayUrl)
            }
        }
    }

    private fun ensureRecordAudioPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        recordAudioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
    }
}
