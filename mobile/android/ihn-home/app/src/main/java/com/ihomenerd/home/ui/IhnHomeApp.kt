package com.ihomenerd.home.ui

import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Cable
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Devices
import androidx.compose.material.icons.outlined.FolderZip
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.SettingsEthernet
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material.icons.outlined.Storage
import androidx.compose.material.icons.outlined.StopCircle
import androidx.compose.material.icons.outlined.Thermostat
import androidx.compose.material.icons.outlined.WifiTethering
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.ihomenerd.home.data.CertificateInfo
import com.ihomenerd.home.data.CapabilityInfo
import com.ihomenerd.home.data.ClusterNode
import com.ihomenerd.home.data.ConnectedApp
import com.ihomenerd.home.data.ConnectedClient
import com.ihomenerd.home.data.DiscoveryInfo
import com.ihomenerd.home.data.GatewaySnapshot
import com.ihomenerd.home.data.HealthInfo
import com.ihomenerd.home.data.IhnGatewayRepository
import com.ihomenerd.home.data.SystemStats
import com.ihomenerd.home.data.TrustInfo
import com.ihomenerd.home.runtime.LocalNodeRuntime
import com.ihomenerd.home.runtime.LocalRuntimeClient
import com.ihomenerd.home.runtime.LocalRuntimeState
import com.ihomenerd.home.runtime.NodeRuntimeService
import com.ihomenerd.home.runtime.PronuncoCompareResult
import com.ihomenerd.home.runtime.TranslatePreviewResponse
import com.ihomenerd.home.ui.theme.Accent
import com.ihomenerd.home.ui.theme.Error
import com.ihomenerd.home.ui.theme.Success
import com.ihomenerd.home.ui.theme.Warning
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private enum class HomeTab(
    val label: String,
    val icon: ImageVector
) {
    Node("This node", Icons.Outlined.Devices),
    Trust("Trust", Icons.Outlined.Shield),
    Models("Models", Icons.Outlined.FolderZip),
    Session("Session", Icons.Outlined.Route)
}

private data class Stat(
    val label: String,
    val value: String,
    val supporting: String,
    val tone: Color = Accent
)

@Composable
fun IhnHomeApp(
    initialGatewayUrl: String? = null,
    viewModel: IhnHomeViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val localRuntimeState by LocalNodeRuntime.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val uriHandler = LocalUriHandler.current
    val repository = remember { IhnGatewayRepository() }
    val scope = rememberCoroutineScope()
    var selectedTab by remember { mutableStateOf(HomeTab.Node) }

    val openCommandCenter = {
        val target = repository.commandCenterUrl(uiState.connectedBaseUrl, uiState.snapshot)
        if (target != null) {
            uriHandler.openUri(target)
        }
    }
    val startLocalRuntime = {
        NodeRuntimeService.start(context.applicationContext)
    }
    val stopLocalRuntime = {
        NodeRuntimeService.stop(context.applicationContext)
    }
    val useLocalRuntime = {
        viewModel.setGatewayFromExternal(localSetupLoopbackUrl())
    }
    val openLocalCommandCenter = {
        if (localRuntimeState.running) {
            uriHandler.openUri(localCommandCenterLoopbackUrl(localRuntimeState))
        }
    }
    val openSetup = {
        val target = repository.setupUrl(uiState.connectedBaseUrl)
        if (target != null) {
            uriHandler.openUri(target)
        }
    }
    val openNetworkSettings = {
        context.startActivity(
            Intent(Settings.ACTION_WIRELESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }
    val enableTravelMode = {
        viewModel.setTravelModeEnabled(true)
        NodeRuntimeService.start(context.applicationContext)
        viewModel.setGatewayFromExternal(localSetupLoopbackUrl())
    }
    val disableTravelMode = {
        viewModel.setTravelModeEnabled(false)
    }

    LaunchedEffect(initialGatewayUrl) {
        if (!initialGatewayUrl.isNullOrBlank()) {
            viewModel.setGatewayFromExternal(initialGatewayUrl)
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            NavigationBar {
                HomeTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        when (selectedTab) {
            HomeTab.Node -> NodeScreen(
                modifier = Modifier.padding(innerPadding),
                uiState = uiState,
                localRuntimeState = localRuntimeState,
                onBaseUrlChange = viewModel::updateDraftBaseUrl,
                onConnect = viewModel::connect,
                onRefresh = viewModel::refresh,
                onStartLocalRuntime = startLocalRuntime,
                onStopLocalRuntime = stopLocalRuntime,
                onUseLocalRuntime = useLocalRuntime,
                onOpenLocalCommandCenter = openLocalCommandCenter,
                onOpenCommandCenter = openCommandCenter,
                onOpenSetup = openSetup
            )
            HomeTab.Trust -> TrustScreen(
                modifier = Modifier.padding(innerPadding),
                uiState = uiState,
                onBaseUrlChange = viewModel::updateDraftBaseUrl,
                onConnect = viewModel::connect,
                onRefresh = viewModel::refresh,
                onOpenSetup = openSetup
            )
            HomeTab.Models -> ModelsScreen(
                modifier = Modifier.padding(innerPadding),
                uiState = uiState,
                localRuntimeState = localRuntimeState,
                onBaseUrlChange = viewModel::updateDraftBaseUrl,
                onConnect = viewModel::connect,
                onRefresh = viewModel::refresh,
                loadLocalPack = { packId, onDone, onError ->
                    scope.launch {
                        try {
                            withContext(Dispatchers.IO) {
                                LocalRuntimeClient.loadPack(packId)
                            }
                            onDone()
                        } catch (exc: Exception) {
                            onError(exc.message ?: exc.javaClass.simpleName)
                        }
                    }
                },
                unloadLocalPack = { packId, onDone, onError ->
                    scope.launch {
                        try {
                            withContext(Dispatchers.IO) {
                                LocalRuntimeClient.unloadPack(packId)
                            }
                            onDone()
                        } catch (exc: Exception) {
                            onError(exc.message ?: exc.javaClass.simpleName)
                        }
                    }
                }
            )
            HomeTab.Session -> SessionScreen(
                modifier = Modifier.padding(innerPadding),
                uiState = uiState,
                localRuntimeState = localRuntimeState,
                onBaseUrlChange = viewModel::updateDraftBaseUrl,
                onConnect = viewModel::connect,
                onRefresh = viewModel::refresh,
                onStartLocalRuntime = startLocalRuntime,
                onStopLocalRuntime = stopLocalRuntime,
                onUseLocalRuntime = useLocalRuntime,
                onOpenLocalCommandCenter = openLocalCommandCenter,
                onOpenCommandCenter = openCommandCenter,
                onOpenSetup = openSetup,
                onOpenNetworkSettings = openNetworkSettings,
                onEnableTravelMode = enableTravelMode,
                onDisableTravelMode = disableTravelMode,
                runLocalPronuncoCompare = { expected, actual, onResult, onError ->
                    scope.launch {
                        try {
                            val result = withContext(Dispatchers.IO) {
                                LocalRuntimeClient.comparePinyin(expected, actual)
                            }
                            onResult(result)
                        } catch (exc: Exception) {
                            onError(exc.message ?: exc.javaClass.simpleName)
                        }
                    }
                },
                runLocalTranslatePreview = { text, onResult, onError ->
                    scope.launch {
                        try {
                            val result = withContext(Dispatchers.IO) {
                                LocalRuntimeClient.translatePreview(text)
                            }
                            onResult(result)
                        } catch (exc: Exception) {
                            onError(exc.message ?: exc.javaClass.simpleName)
                        }
                    }
                }
            )
        }
    }
}

@Composable
private fun NodeScreen(
    modifier: Modifier = Modifier,
    uiState: IhnHomeUiState,
    localRuntimeState: LocalRuntimeState,
    onBaseUrlChange: (String) -> Unit,
    onConnect: () -> Unit,
    onRefresh: () -> Unit,
    onStartLocalRuntime: () -> Unit,
    onStopLocalRuntime: () -> Unit,
    onUseLocalRuntime: () -> Unit,
    onOpenLocalCommandCenter: () -> Unit,
    onOpenCommandCenter: () -> Unit,
    onOpenSetup: () -> Unit
) {
    val snapshot = uiState.snapshot
    val discovery = snapshot?.discovery
    val stats = buildNodeStats(snapshot)

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            ScreenHeader(
                "🏠",
                discovery?.hostname?.ifBlank { "iHN Node" } ?: "iHN Node",
                discovery?.let { "Portable node host on ${it.ip}" } ?: "Portable node host"
            )
        }
        item {
            ConnectionCard(
                uiState = uiState,
                onBaseUrlChange = onBaseUrlChange,
                onConnect = onConnect,
                onRefresh = onRefresh
            )
        }
        item {
            LocalRuntimeCard(
                state = localRuntimeState,
                onStart = onStartLocalRuntime,
                onStop = onStopLocalRuntime,
                onUseLocalRuntime = onUseLocalRuntime,
                onOpenLocalCommandCenter = onOpenLocalCommandCenter
            )
        }
        item {
            ServerReadinessCard(state = localRuntimeState)
        }

        if (snapshot == null) {
            item {
                EmptyStateCard(
                    title = "No live gateway data yet",
                    supporting = uiState.errorMessage
                        ?: "Point the shell at an iHN setup URL such as http://host:17778, or switch to the local Android runtime on http://127.0.0.1:17778."
                )
            }
        } else {
            item { HostCard(snapshot) }
            item { SectionLabel("This device") }
            item { TwoByTwoGrid(stats = stats) }

            if (!discovery?.suggestedRoles.isNullOrEmpty()) {
                item { SectionLabel("Suggested roles") }
                items(discovery?.suggestedRoles.orEmpty()) { role ->
                    ToneRow(
                        title = role,
                        supporting = "Live role hint from this gateway",
                        tone = Accent,
                        icon = Icons.Outlined.Route
                    )
                }
            }

            if (!discovery?.strengths.isNullOrEmpty()) {
                item { SectionLabel("Strengths") }
                items(discovery?.strengths.orEmpty()) { strength ->
                    ToneRow(
                        title = strength,
                        supporting = "Current hardware fit from discovery telemetry",
                        tone = Success,
                        icon = Icons.Outlined.CheckCircle
                    )
                }
            }

            item { SectionLabel("Actions") }
            item {
                ActionStack(
                    primaryLabel = "Refresh gateway",
                    secondaryLabel = "Open Command Center",
                    tertiaryLabel = "Open trust setup",
                    onPrimary = onRefresh,
                    onSecondary = onOpenCommandCenter,
                    onTertiary = onOpenSetup
                )
            }
        }
    }
}

@Composable
private fun TrustScreen(
    modifier: Modifier = Modifier,
    uiState: IhnHomeUiState,
    onBaseUrlChange: (String) -> Unit,
    onConnect: () -> Unit,
    onRefresh: () -> Unit,
    onOpenSetup: () -> Unit
) {
    val trust = uiState.snapshot?.trust

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { ScreenHeader("🛡️", "Trust", "Home CA and server certificate health") }
        item {
            ConnectionCard(
                uiState = uiState,
                onBaseUrlChange = onBaseUrlChange,
                onConnect = onConnect,
                onRefresh = onRefresh
            )
        }

        if (trust == null) {
            item {
                EmptyStateCard(
                    title = "Trust status unavailable",
                    supporting = uiState.errorMessage
                        ?: "Connect to an iHN setup URL to load Home CA and server certificate health."
                )
            }
        } else {
            item {
                HighlightCard(
                    tone = trustTone(trust.status),
                    title = trust.status.replace('_', ' ').replaceFirstChar { it.titlecase(Locale.US) },
                    supporting = trust.message
                ) {
                    trust.lanIp?.takeIf { it.isNotBlank() }?.let {
                        MonoRow("Current LAN IP", it)
                        Spacer(Modifier.height(12.dp))
                    }
                    if (trust.hostnames.isNotEmpty()) {
                        MonoRow("Covered hostnames", trust.hostnames.joinToString(", "))
                    }
                }
            }

            trust.homeCa?.let { cert ->
                item { SectionLabel("Home CA") }
                item { CertificateCard(cert = cert, title = "Home CA", tone = trustTone(trust.status)) }
            }

            trust.serverCert?.let { cert ->
                item { SectionLabel("Server certificate") }
                item { CertificateCard(cert = cert, title = "Server certificate", tone = Accent) }
            }

            item { SectionLabel("Actions") }
            item {
                ActionStack(
                    primaryLabel = "Open trust setup",
                    secondaryLabel = "Refresh trust status",
                    tertiaryLabel = "Refresh gateway",
                    onPrimary = onOpenSetup,
                    onSecondary = onRefresh,
                    onTertiary = onRefresh
                )
            }
        }
    }
}

@Composable
private fun ModelsScreen(
    modifier: Modifier = Modifier,
    uiState: IhnHomeUiState,
    localRuntimeState: LocalRuntimeState,
    onBaseUrlChange: (String) -> Unit,
    onConnect: () -> Unit,
    onRefresh: () -> Unit,
    loadLocalPack: (String, () -> Unit, (String) -> Unit) -> Unit,
    unloadLocalPack: (String, () -> Unit, (String) -> Unit) -> Unit
) {
    val snapshot = uiState.snapshot
    val discovery = snapshot?.discovery
    val health = snapshot?.health
    val capabilityRegistry = snapshot?.capabilities

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { ScreenHeader("📦", "Models", "Live model inventory from the gateway") }
        item {
            ConnectionCard(
                uiState = uiState,
                onBaseUrlChange = onBaseUrlChange,
                onConnect = onConnect,
                onRefresh = onRefresh
            )
        }

        item { SectionLabel("Android-hosted packs") }
        items(localRuntimeState.packs) { pack ->
            LocalPackRow(
                pack = pack,
                runtimeRunning = localRuntimeState.running,
                onLoad = { loadLocalPack(pack.id, {}, {}) },
                onUnload = { unloadLocalPack(pack.id, {}, {}) }
            )
        }

        if (localRuntimeState.running) {
            item {
                CardShell {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SmallOverline("Runtime model catalog")
                        Text(
                            text = "GET /v1/models",
                            color = MaterialTheme.colorScheme.onSurface,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        val catalogUrl = localRuntimeState.localIp?.let { ip ->
                            "https://$ip:${localRuntimeState.port}/v1/models"
                        } ?: "https://127.0.0.1:${localRuntimeState.port}/v1/models"
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = MaterialTheme.shapes.small
                        ) {
                            Text(
                                text = catalogUrl,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                color = MaterialTheme.colorScheme.onSurface,
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                        val loadedCount = localRuntimeState.packs.count { it.loaded }
                        val loadableCount = localRuntimeState.packs.count { !it.loaded && it.loadable }
                        Text(
                            text = "$loadedCount loaded · $loadableCount loadable · ${localRuntimeState.packs.size} total packs",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }

        if (snapshot == null) {
            item {
                EmptyStateCard(
                    title = "Model inventory unavailable",
                    supporting = uiState.errorMessage
                        ?: "Connect to an iHN gateway to see loaded models and capability bindings, or start the Android runtime to serve local packs."
                )
            }
        } else {
            item {
                HighlightCard(
                    tone = Accent,
                    title = "Recommended for this node",
                    supporting = discovery?.strengths?.joinToString(" · ")
                        ?: "Role and model fit will come from discovery telemetry."
                ) {
                    Text(
                        text = discovery?.suggestedRoles?.joinToString(", ")
                            ?: "No role hints reported yet.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            if (!capabilityRegistry?.qualityProfiles.isNullOrEmpty()) {
                item {
                    HighlightCard(
                        tone = Success,
                        title = "Quality profiles",
                        supporting = "The gateway decides how much speed-vs-quality choice it can honestly offer on this hardware."
                    ) {
                        Text(
                            text = capabilityRegistry.qualityProfiles.joinToString(" · "),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            item { SectionLabel("Loaded models") }
            if (discovery?.models.isNullOrEmpty()) {
                item { EmptyStateCard("No loaded models", "Ollama is not reporting any currently loaded model names.") }
            } else {
                items(discovery?.models.orEmpty()) { model ->
                    ToneRow(
                        title = model,
                        supporting = "Loaded on this node right now",
                        tone = Success,
                        icon = Icons.Outlined.FolderZip
                    )
                }
            }

            item { SectionLabel("Capability bindings") }
            if (!capabilityRegistry?.details.isNullOrEmpty()) {
                items(capabilityRegistry.details.values.toList()) { capability ->
                    CapabilityRow(capability)
                }
            } else if (health?.capabilityModels.isNullOrEmpty()) {
                item { EmptyStateCard("No capability map", "The gateway did not return a capability-to-model map.") }
            } else {
                items(health?.capabilityModels?.entries?.toList().orEmpty()) { (capability, model) ->
                    ToneRow(
                        title = capability,
                        supporting = model,
                        tone = Accent,
                        icon = Icons.Outlined.Cable
                    )
                }
            }
        }
    }
}

@Composable
private fun CapabilityRow(capability: CapabilityInfo) {
    val tone = when {
        capability.available -> Success
        capability.loadState == "available_to_load" -> Accent
        else -> Warning
    }
    val qualityModes = capability.qualityModes
        .filter { it.label.isNotBlank() }
        .joinToString("/") { it.label.lowercase(Locale.US) }
    val supporting = buildList {
        capability.backend?.takeIf { it.isNotBlank() }?.let { add(it) }
        capability.tier?.takeIf { it.isNotBlank() }?.let { add(it) }
        capability.latencyClass?.takeIf { it.isNotBlank() }?.let { add(it) }
        add(if (capability.offline) "offline" else "network")
        capability.loadState?.takeIf { it.isNotBlank() }?.let { add(it) }
        if (qualityModes.isNotBlank()) add("modes $qualityModes")
        capability.packName?.takeIf { it.isNotBlank() }?.let { add(it) }
    }.joinToString(" · ")

    CardShell {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = capability.title.ifBlank { capability.name },
                        color = MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = capability.name,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall,
                        fontFamily = FontFamily.Monospace
                    )
                }
                ToneBadge(
                    label = when {
                        capability.available -> "available"
                        capability.loadState == "available_to_load" -> "loadable"
                        else -> "planned"
                    },
                    color = tone
                )
            }
            if (supporting.isNotBlank()) {
                Text(
                    text = supporting,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            if (capability.languages.isNotEmpty()) {
                Text(
                    text = "Languages: ${capability.languages.joinToString(", ")}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            capability.note?.takeIf { it.isNotBlank() }?.let {
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun SessionScreen(
    modifier: Modifier = Modifier,
    uiState: IhnHomeUiState,
    localRuntimeState: LocalRuntimeState,
    onBaseUrlChange: (String) -> Unit,
    onConnect: () -> Unit,
    onRefresh: () -> Unit,
    onStartLocalRuntime: () -> Unit,
    onStopLocalRuntime: () -> Unit,
    onUseLocalRuntime: () -> Unit,
    onOpenLocalCommandCenter: () -> Unit,
    onOpenCommandCenter: () -> Unit,
    onOpenSetup: () -> Unit,
    onOpenNetworkSettings: () -> Unit,
    onEnableTravelMode: () -> Unit,
    onDisableTravelMode: () -> Unit,
    runLocalPronuncoCompare: (
        expected: String,
        actual: String,
        onResult: (PronuncoCompareResult) -> Unit,
        onError: (String) -> Unit
    ) -> Unit,
    runLocalTranslatePreview: (
        text: String,
        onResult: (TranslatePreviewResponse) -> Unit,
        onError: (String) -> Unit
    ) -> Unit
) {
    val snapshot = uiState.snapshot
    val cluster = snapshot?.cluster
    val system = snapshot?.system
    val gatewayIsLocalNode = uiState.connectedBaseUrl.contains("127.0.0.1") ||
        uiState.connectedBaseUrl.contains("10.0.2.2") ||
        snapshot?.discovery?.hostname == localRuntimeState.nodeName

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { ScreenHeader("🌐", "Session", "Gateway sessions, apps, and home nodes") }
        item {
            ConnectionCard(
                uiState = uiState,
                onBaseUrlChange = onBaseUrlChange,
                onConnect = onConnect,
                onRefresh = onRefresh
            )
        }

        item {
            TravelModeCard(
                travelModeEnabled = uiState.travelModeEnabled,
                localRuntimeState = localRuntimeState,
                onEnableTravelMode = onEnableTravelMode,
                onDisableTravelMode = onDisableTravelMode,
                onOpenNetworkSettings = onOpenNetworkSettings,
                onUseLocalRuntime = onUseLocalRuntime,
                onOpenLocalCommandCenter = onOpenLocalCommandCenter,
                onStartLocalRuntime = onStartLocalRuntime,
                onStopLocalRuntime = onStopLocalRuntime
            )
        }
        item {
            PronuncoHelperCard(
                runtimeRunning = localRuntimeState.running,
                onStartRuntime = onStartLocalRuntime,
                onUseLocalRuntime = onUseLocalRuntime,
                onOpenLocalCommandCenter = onOpenLocalCommandCenter,
                onRunCompare = runLocalPronuncoCompare
            )
        }
        item {
            TranslatePreviewCard(
                runtimeRunning = localRuntimeState.running,
                translatePackLoaded = localRuntimeState.packs.any { it.id == "translate-small-preview" && it.loaded },
                onStartRuntime = onStartLocalRuntime,
                onRunTranslate = runLocalTranslatePreview
            )
        }

        if (snapshot == null) {
            item {
                EmptyStateCard(
                    title = "Session view unavailable",
                    supporting = uiState.errorMessage
                        ?: "Connect to an iHN gateway to see active sessions and known nodes, or use the local Android runtime for a self-hosted session."
                )
            }
        } else {
            item {
                HighlightCard(
                    tone = Accent,
                    title = "Gateway session summary",
                    supporting = "${system?.sessionCount ?: 0} active sessions · ${cluster?.nodes?.size ?: 0} known nodes · ${system?.connectedClients?.size ?: 0} recent clients"
                ) {
                    cluster?.gatewayUrl?.takeIf { it.isNotBlank() }?.let { MonoRow("Command Center", it) }
                }
            }

            item { SectionLabel("Connected apps") }
            if (system?.connectedApps.isNullOrEmpty()) {
                item {
                    EmptyStateCard(
                        title = "No active client apps",
                        supporting = "When PronunCo or other clients connect, they will appear here."
                    )
                }
            } else {
                items(system?.connectedApps.orEmpty()) { app ->
                    ConnectedAppRow(app)
                }
            }

            if (!gatewayIsLocalNode) {
                item { SectionLabel("Clients on connected gateway") }
                if (system?.connectedClients.isNullOrEmpty()) {
                    item {
                        EmptyStateCard(
                            title = "No recent remote clients reported",
                            supporting = "When phones, browsers, or other nodes use this gateway, they will appear here."
                        )
                    }
                } else {
                    items(system?.connectedClients.orEmpty()) { client ->
                        ConnectedClientRow(client)
                    }
                }
            }

            item { SectionLabel("Home nodes") }
            items(cluster?.nodes.orEmpty()) { node ->
                ClusterNodeCard(node)
            }

            item { SectionLabel("Actions") }
            item {
                ActionStack(
                    primaryLabel = "Open Command Center",
                    secondaryLabel = "Open trust setup",
                    tertiaryLabel = "Refresh gateway",
                    onPrimary = onOpenCommandCenter,
                    onSecondary = onOpenSetup,
                    onTertiary = onRefresh
                )
            }
        }
    }
}

@Composable
private fun TravelModeCard(
    travelModeEnabled: Boolean,
    localRuntimeState: LocalRuntimeState,
    onEnableTravelMode: () -> Unit,
    onDisableTravelMode: () -> Unit,
    onOpenNetworkSettings: () -> Unit,
    onUseLocalRuntime: () -> Unit,
    onOpenLocalCommandCenter: () -> Unit,
    onStartLocalRuntime: () -> Unit,
    onStopLocalRuntime: () -> Unit
) {
    val remoteClients = localRuntimeState.remoteClients
    val tone = when {
        travelModeEnabled && localRuntimeState.running -> Success
        travelModeEnabled -> Warning
        else -> Accent
    }
    val title = when {
        travelModeEnabled && localRuntimeState.running -> "Travel mode is active"
        travelModeEnabled -> "Travel mode is enabled but runtime is stopped"
        else -> "Travel mode is off"
    }
    val supporting = when {
        localRuntimeState.running && remoteClients.isNotEmpty() ->
            "${remoteClients.size} recent remote clients · ${localRuntimeState.sessionCount} handled requests"
        localRuntimeState.running ->
            "Local setup on :17778 and Command Center on HTTPS :17777 are ready for nearby devices."
        else ->
            "Use this Android node as a portable host for pair/trust, nearby clients, and the full Command Center."
    }

    HighlightCard(
        tone = tone,
        title = title,
        supporting = supporting
    ) {
        MonoRow("Setup URL", localSetupLoopbackUrl())
        Spacer(Modifier.height(12.dp))
        MonoRow("Command Center URL", localCommandCenterLoopbackUrl(localRuntimeState))
        localLanUrl(localRuntimeState)?.let {
            Spacer(Modifier.height(12.dp))
            MonoRow("LAN URL", it)
        }
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                onClick = if (travelModeEnabled) onDisableTravelMode else onEnableTravelMode,
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Outlined.WifiTethering, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text(if (travelModeEnabled) "Disable travel mode" else "Enable travel mode")
            }
            OutlinedButton(
                onClick = onOpenNetworkSettings,
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Outlined.SettingsEthernet, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Network settings")
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedButton(
                onClick = onStartLocalRuntime,
                modifier = Modifier.weight(1f),
                enabled = !localRuntimeState.running
            ) {
                Icon(Icons.Outlined.PlayArrow, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Start runtime")
            }
            OutlinedButton(
                onClick = onStopLocalRuntime,
                modifier = Modifier.weight(1f),
                enabled = localRuntimeState.running
            ) {
                Icon(Icons.Outlined.StopCircle, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Stop runtime")
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedButton(
                onClick = onUseLocalRuntime,
                modifier = Modifier.weight(1f),
                enabled = localRuntimeState.running
            ) {
                Icon(Icons.Outlined.Route, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Use local node")
            }
            OutlinedButton(
                onClick = onOpenLocalCommandCenter,
                modifier = Modifier.weight(1f),
                enabled = localRuntimeState.running
            ) {
                Icon(Icons.Outlined.Link, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Open HTTPS :17777")
            }
        }
        Spacer(Modifier.height(14.dp))
        if (remoteClients.isEmpty()) {
            Text(
                text = "No recent remote clients yet. Nearby phones or laptops will appear here after they use this Android node over LAN or hotspot.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
        } else {
            SmallOverline("Recent clients on this Android node")
            Spacer(Modifier.height(8.dp))
            remoteClients.forEach { client ->
                ConnectedClientRow(
                    client = ConnectedClient(
                        ip = client.address,
                        label = client.label,
                        requestCount = client.requestCount,
                        lastSeen = relativeClientSeen(client.lastSeenMillis),
                        lastPath = client.lastPath,
                        userAgent = client.userAgent
                    )
                )
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun ScreenHeader(emoji: String, title: String, subtitle: String) {
    Column(modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp)) {
        Text(text = emoji, fontSize = 22.sp)
        Spacer(Modifier.height(10.dp))
        Text(
            text = title,
            color = MaterialTheme.colorScheme.onBackground,
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.SansSerif
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = subtitle,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun ConnectionCard(
    uiState: IhnHomeUiState,
    onBaseUrlChange: (String) -> Unit,
    onConnect: () -> Unit,
    onRefresh: () -> Unit
) {
    CardShell {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    SmallOverline("Gateway")
                    Text(
                        text = uiState.connectedBaseUrl.ifBlank { "Not connected yet" },
                        color = MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    ToneBadge(
                        label = if (uiState.snapshot != null) "live" else "offline",
                        color = if (uiState.snapshot != null) Success else Warning
                    )
                }
            }

            OutlinedTextField(
                value = uiState.draftBaseUrl,
                onValueChange = onBaseUrlChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Setup URL") },
                supportingText = {
                    Text("Use HTTP :17778 for pairing and trust bootstrap. The full browser-facing Command Center is served on HTTPS :17777.")
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri)
            )

            uiState.errorMessage?.let { message ->
                Text(
                    text = message,
                    color = Warning,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            uiState.lastUpdatedLabel?.let { label ->
                Text(
                    text = label,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = onConnect, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Outlined.Link, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Connect")
                }
                OutlinedButton(onClick = onRefresh, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Outlined.Refresh, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Refresh")
                }
            }
        }
    }
}

@Composable
private fun HostCard(snapshot: GatewaySnapshot) {
    val discovery = snapshot.discovery ?: return
    val gatewayUrl = snapshot.cluster?.gatewayUrl ?: "https://${discovery.ip}:${discovery.port}"
    val sessions = snapshot.system?.sessionCount ?: 0
    val models = discovery.models.size

    Card(
        modifier = Modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = CardDefaults.outlinedCardBorder()
    ) {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    SmallOverline("Hosting Command Center")
                    Text(
                        text = discovery.hostname,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                ToneBadge(if (snapshot.health?.ok == true) "online" else "degraded", if (snapshot.health?.ok == true) Success else Warning)
            }

            MonoRow("Hosted URL", gatewayUrl)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Metric("${snapshot.cluster?.nodes?.size ?: 1}", "nodes", Accent)
                Metric("$sessions", "sessions", MaterialTheme.colorScheme.onSurface)
                Metric("$models", "models", Accent)
            }

            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = MaterialTheme.shapes.medium
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Live gateway data", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                        Text(
                            "${discovery.os} · ${discovery.arch} · ${if (discovery.ollamaReady) "Ollama ready" else "Ollama offline"}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Icon(Icons.Outlined.WifiTethering, contentDescription = null, tint = Accent)
                }
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        modifier = Modifier.padding(horizontal = 20.dp),
        color = MaterialTheme.colorScheme.onSurface,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.SemiBold
    )
}

@Composable
private fun TwoByTwoGrid(stats: List<Stat>) {
    Column(modifier = Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        stats.chunked(2).forEach { rowStats ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                rowStats.forEach { stat ->
                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = CardDefaults.outlinedCardBorder()
                    ) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(stat.label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                            Text(stat.value, color = MaterialTheme.colorScheme.onSurface, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                            Text(stat.supporting, color = stat.tone, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActionStack(
    primaryLabel: String,
    secondaryLabel: String,
    tertiaryLabel: String,
    onPrimary: () -> Unit,
    onSecondary: () -> Unit,
    onTertiary: () -> Unit
) {
    Column(
        modifier = Modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Button(onClick = onPrimary, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.Refresh, contentDescription = null)
            Spacer(Modifier.size(8.dp))
            Text(primaryLabel)
        }
        OutlinedButton(onClick = onSecondary, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.SettingsEthernet, contentDescription = null)
            Spacer(Modifier.size(8.dp))
            Text(secondaryLabel)
        }
        OutlinedButton(onClick = onTertiary, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.Security, contentDescription = null)
            Spacer(Modifier.size(8.dp))
            Text(tertiaryLabel)
        }
    }
}

@Composable
private fun HighlightCard(
    tone: Color,
    title: String,
    supporting: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = CardDefaults.outlinedCardBorder()
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp), content = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(tone.copy(alpha = 0.15f), MaterialTheme.shapes.medium),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Outlined.Security, contentDescription = null, tint = tone)
                }
                Column {
                    Text(title, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                    Text(supporting, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                }
            }
            content()
        })
    }
}

@Composable
private fun MonoRow(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        SmallOverline(label)
        Surface(
            color = MaterialTheme.colorScheme.surfaceVariant,
            shape = MaterialTheme.shapes.small
        ) {
            Text(
                text = value,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}

@Composable
private fun ToneRow(
    title: String,
    supporting: String,
    tone: Color,
    icon: ImageVector = Icons.Outlined.Thermostat
) {
    CardShell {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(tone.copy(alpha = 0.15f), MaterialTheme.shapes.small),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = tone)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(title, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                Text(supporting, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun LocalRuntimeCard(
    state: LocalRuntimeState,
    onStart: () -> Unit,
    onStop: () -> Unit,
    onUseLocalRuntime: () -> Unit,
    onOpenLocalCommandCenter: () -> Unit
) {
    HighlightCard(
        tone = if (state.running) Success else Warning,
        title = if (state.running) "Android runtime is serving HTTPS :17777" else "Android runtime is not serving yet",
        supporting = if (state.running) {
            "${state.packs.count { it.loaded }} ready packs · ${state.sessionCount} handled requests"
        } else {
            "Start the local node runtime to host the Command Center and PronunCo helper APIs."
        }
    ) {
        MonoRow("Setup URL", localSetupLoopbackUrl())
        Spacer(Modifier.height(12.dp))
        MonoRow("Command Center URL", localCommandCenterLoopbackUrl(state))
        localLanUrl(state)?.let {
            Spacer(Modifier.height(12.dp))
            MonoRow("LAN URL", it)
        }
        Spacer(Modifier.height(12.dp))
        MonoRow("Node name", state.nodeName)
        state.lastError?.takeIf { it.isNotBlank() }?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = Warning, style = MaterialTheme.typography.bodySmall)
        }
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                onClick = onStart,
                modifier = Modifier.weight(1f),
                enabled = !state.running
            ) {
                Icon(Icons.Outlined.PlayArrow, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Start")
            }
            OutlinedButton(
                onClick = onStop,
                modifier = Modifier.weight(1f),
                enabled = state.running
            ) {
                Icon(Icons.Outlined.StopCircle, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Stop")
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedButton(
                onClick = onUseLocalRuntime,
                modifier = Modifier.weight(1f),
                enabled = state.running
            ) {
                Icon(Icons.Outlined.SettingsEthernet, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Use local node")
            }
            OutlinedButton(
                onClick = onOpenLocalCommandCenter,
                modifier = Modifier.weight(1f),
                enabled = state.running
            ) {
                Icon(Icons.Outlined.Link, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Open HTTPS :17777")
            }
        }
    }
}

@Composable
private fun LocalPackRow(
    pack: com.ihomenerd.home.runtime.LocalPack,
    runtimeRunning: Boolean,
    onLoad: (() -> Unit)? = null,
    onUnload: (() -> Unit)? = null
) {
    val isServing = runtimeRunning && pack.loaded
    val tone = when {
        isServing -> Success
        pack.loaded -> Accent
        else -> Warning
    }
    val status = when {
        isServing -> "serving locally now"
        pack.loaded -> "ready when runtime starts"
        else -> "planned"
    }
    ToneRow(
        title = pack.name,
        supporting = "${pack.kind} · $status · ${pack.note}",
        tone = tone,
        icon = if (pack.loaded) Icons.Outlined.CheckCircle else Icons.Outlined.Storage
    )
    if (pack.loadable) {
        CardShell {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(
                    onClick = { onLoad?.invoke() },
                    modifier = Modifier.weight(1f),
                    enabled = runtimeRunning && !pack.loaded
                ) {
                    Icon(Icons.Outlined.PlayArrow, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Load pack")
                }
                OutlinedButton(
                    onClick = { onUnload?.invoke() },
                    modifier = Modifier.weight(1f),
                    enabled = runtimeRunning && pack.loaded
                ) {
                    Icon(Icons.Outlined.StopCircle, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Unload pack")
                }
            }
        }
    }
}

@Composable
private fun PronuncoHelperCard(
    runtimeRunning: Boolean,
    onStartRuntime: () -> Unit,
    onUseLocalRuntime: () -> Unit,
    onOpenLocalCommandCenter: () -> Unit,
    onRunCompare: (
        expected: String,
        actual: String,
        onResult: (PronuncoCompareResult) -> Unit,
        onError: (String) -> Unit
    ) -> Unit
) {
    var expected by remember { mutableStateOf("ni3 hao3") }
    var actual by remember { mutableStateOf("ni3 hao2") }
    var isRunningCompare by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<PronuncoCompareResult?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    CardShell {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "Real local helper pack for PronunCo",
                color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "This calls the Android-hosted HTTP setup/control endpoint on :17778 and returns pinyin normalization, tone mismatches, and syllable distance.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )

            OutlinedTextField(
                value = expected,
                onValueChange = { expected = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Expected pinyin") },
                singleLine = true
            )
            OutlinedTextField(
                value = actual,
                onValueChange = { actual = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Actual pinyin") },
                singleLine = true
            )

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = {
                        error = null
                        result = null
                        isRunningCompare = true
                        onRunCompare(
                            expected,
                            actual,
                            {
                                result = it
                                isRunningCompare = false
                            },
                            {
                                error = it
                                isRunningCompare = false
                            }
                        )
                    },
                    modifier = Modifier.weight(1f),
                    enabled = runtimeRunning && !isRunningCompare
                ) {
                    Icon(Icons.Outlined.Cable, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text(if (isRunningCompare) "Checking..." else "Run local compare")
                }
                OutlinedButton(
                    onClick = onStartRuntime,
                    modifier = Modifier.weight(1f),
                    enabled = !runtimeRunning
                ) {
                    Icon(Icons.Outlined.PlayArrow, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Start runtime")
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(
                    onClick = onUseLocalRuntime,
                    modifier = Modifier.weight(1f),
                    enabled = runtimeRunning
                ) {
                    Icon(Icons.Outlined.SettingsEthernet, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Use local node")
                }
                OutlinedButton(
                    onClick = onOpenLocalCommandCenter,
                    modifier = Modifier.weight(1f),
                    enabled = runtimeRunning
                ) {
                    Icon(Icons.Outlined.Link, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Open HTTPS :17777")
                }
            }

            if (!runtimeRunning) {
                Text(
                    text = "Start the local runtime first. The compare button uses the Android-hosted endpoint, not a fake in-app calculation.",
                    color = Warning,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            error?.let {
                Text(text = it, color = Warning, style = MaterialTheme.typography.bodySmall)
            }

            result?.let {
                HighlightCard(
                    tone = if (it.toneMismatches == 0 && it.syllableDistance == 0) Success else Accent,
                    title = "PronunCo support snapshot",
                    supporting = "Similarity ${(it.similarity * 100).toInt()}% · tone mismatches ${it.toneMismatches} · syllable distance ${it.syllableDistance}"
                ) {
                    MonoRow("Expected normalized", it.expectedNormalized)
                    Spacer(Modifier.height(12.dp))
                    MonoRow("Actual normalized", it.actualNormalized)
                    Spacer(Modifier.height(12.dp))
                    MonoRow("Expected syllables", it.expectedSyllables.joinToString(" "))
                    Spacer(Modifier.height(12.dp))
                    MonoRow("Actual syllables", it.actualSyllables.joinToString(" "))
                }
            }
        }
    }
}

@Composable
private fun TranslatePreviewCard(
    runtimeRunning: Boolean,
    translatePackLoaded: Boolean,
    onStartRuntime: () -> Unit,
    onRunTranslate: (
        text: String,
        onResult: (TranslatePreviewResponse) -> Unit,
        onError: (String) -> Unit
    ) -> Unit
) {
    var text by remember { mutableStateOf("wo3 xiang3 xue2 zhong1 wen2") }
    var isRunning by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<TranslatePreviewResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    CardShell {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "Mandarin preview translation",
                color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "This uses the Android-hosted translate preview pack. It is a small local helper, not a full general model yet.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )

            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Phrase to translate") },
                singleLine = true
            )

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = {
                        error = null
                        result = null
                        isRunning = true
                        onRunTranslate(
                            text,
                            {
                                result = it
                                isRunning = false
                            },
                            {
                                error = it
                                isRunning = false
                            }
                        )
                    },
                    modifier = Modifier.weight(1f),
                    enabled = runtimeRunning && translatePackLoaded && !isRunning
                ) {
                    Icon(Icons.Outlined.Cable, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text(if (isRunning) "Checking..." else "Run translation")
                }
                OutlinedButton(
                    onClick = onStartRuntime,
                    modifier = Modifier.weight(1f),
                    enabled = !runtimeRunning
                ) {
                    Icon(Icons.Outlined.PlayArrow, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Start runtime")
                }
            }

            if (!translatePackLoaded) {
                Text(
                    text = "Load the Translate Small preview pack from the Models tab first.",
                    color = Warning,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            error?.let {
                Text(text = it, color = Warning, style = MaterialTheme.typography.bodySmall)
            }

            result?.let {
                HighlightCard(
                    tone = if (it.available) Success else Warning,
                    title = if (it.available) "Preview translation available" else "No local match yet",
                    supporting = it.note
                ) {
                    MonoRow("Normalized", it.normalized)
                    Spacer(Modifier.height(12.dp))
                    MonoRow("Matched by", it.matchedBy.ifBlank { "none" })
                    if (it.translation.isNotBlank()) {
                        Spacer(Modifier.height(12.dp))
                        MonoRow("Translation", it.translation)
                    }
                }
            }
        }
    }
}

@Composable
private fun CertificateCard(cert: CertificateInfo, title: String, tone: Color) {
    CardShell {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                ToneBadge(if (cert.present) "present" else "missing", if (cert.present) tone else Error)
            }
            if (cert.subject.isNotBlank()) MonoRow("Subject", cert.subject)
            if (cert.issuer.isNotBlank()) MonoRow("Issuer", cert.issuer)
            if (cert.fingerprintSha256.isNotBlank()) MonoRow("SHA256", cert.fingerprintSha256)
            if (cert.notAfter.isNotBlank()) MonoRow("Expires", cert.notAfter)
            if (cert.sans.isNotEmpty()) MonoRow("SANs", cert.sans.joinToString(", "))
            if (cert.shared) {
                Text(
                    text = "This Home CA is being reused from a shared authority path.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun ConnectedAppRow(app: ConnectedApp) {
    CardShell {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(Accent.copy(alpha = 0.15f), MaterialTheme.shapes.small),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Outlined.Cable, contentDescription = null, tint = Accent)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(app.name, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                Text(
                    "${app.activeSessions} active session${if (app.activeSessions == 1) "" else "s"}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            app.lastSeen?.takeIf { it.isNotBlank() }?.let {
                ToneBadge("seen", Success)
            }
        }
    }
}

@Composable
private fun ConnectedClientRow(client: ConnectedClient) {
    CardShell {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(Success.copy(alpha = 0.15f), MaterialTheme.shapes.small),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Outlined.WifiTethering, contentDescription = null, tint = Success)
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(client.label, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                Text(
                    "${client.requestCount} request${if (client.requestCount == 1) "" else "s"} · ${client.lastSeen ?: "recently"}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
                val supporting = listOfNotNull(
                    client.ip.takeIf { it.isNotBlank() && it != client.label },
                    client.lastPath?.takeIf { it.isNotBlank() }
                ).joinToString(" · ")
                if (supporting.isNotBlank()) {
                    Text(
                        supporting,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                client.userAgent?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        it,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

@Composable
private fun ClusterNodeCard(node: ClusterNode) {
    CardShell {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(node.hostname, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                    Text("${node.ip} · ${node.os ?: "unknown"}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                node.managedState?.let {
                    ToneBadge(it, if (node.offline) Warning else Success)
                }
            }
            if (node.roles.isNotEmpty()) {
                Text(
                    text = "Roles: ${node.roles.joinToString(", ")}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            if (node.models.isNotEmpty()) {
                Text(
                    text = "Models: ${node.models.joinToString(", ")}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            if (!node.runtimeKind.isNullOrBlank()) {
                Text(
                    text = "Runtime: ${node.runtimeKind}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun EmptyStateCard(title: String, supporting: String) {
    CardShell {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
            Text(
                supporting,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@Composable
private fun Metric(value: String, label: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, color = color, fontWeight = FontWeight.Bold, fontSize = 24.sp)
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun ToneBadge(label: String, color: Color) {
    Surface(
        color = color.copy(alpha = 0.12f),
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            color = color,
            style = MaterialTheme.typography.labelSmall
        )
    }
}

@Composable
private fun SmallOverline(text: String) {
    Text(
        text = text,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontSize = 11.sp,
        letterSpacing = 1.sp,
        fontWeight = FontWeight.SemiBold
    )
}

@Composable
private fun CardShell(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = CardDefaults.outlinedCardBorder()
    ) {
        Column(modifier = Modifier.padding(16.dp), content = content)
    }
}

@Composable
private fun ServerReadinessCard(state: LocalRuntimeState) {
    val hasLan = !state.localIps.isNullOrEmpty()
    val networkOk = state.localNetworkTransport == "wifi" || state.localNetworkTransport == "ethernet" || state.localNetworkTransport == "hotspot"

    val readinessTone: Color
    val readinessTitle: String
    val readinessSupporting: String

    when {
        !state.running -> {
            readinessTone = Warning
            readinessTitle = "Server not ready"
            readinessSupporting = "Start the local runtime to begin serving."
        }
        !hasLan -> {
            readinessTone = Warning
            readinessTitle = "No network reachable"
            readinessSupporting = "Connect to Wi-Fi or enable hotspot for LAN serving."
        }
        state.isCharging != true && state.isBatteryOptimizationExempt != true -> {
            readinessTone = Warning
            readinessTitle = "Server degraded"
            readinessSupporting = "Plug in and exempt from battery optimization for reliable semi-headless serving."
        }
        state.isCharging != true -> {
            readinessTone = Warning
            readinessTitle = "Server degraded"
            readinessSupporting = "Device is not charging. Connect to power for long-running node duty."
        }
        state.isBatteryOptimizationExempt != true -> {
            readinessTone = Warning
            readinessTitle = "Server ready but fragile"
            readinessSupporting = "Battery optimization is not exempted. Android may stop the runtime."
        }
        else -> {
            readinessTone = Success
            readinessTitle = "Server ready for node duty"
            readinessSupporting = "Charging · network available · runtime serving on :17777 and :17778."
        }
    }

    HighlightCard(
        tone = readinessTone,
        title = readinessTitle,
        supporting = readinessSupporting
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            ReadinessChip(
                icon = Icons.Outlined.Cable,
                label = when {
                    state.isCharging == true -> "Charging"
                    state.isCharging == false -> "Not charging"
                    else -> "Unknown"
                },
                tone = when {
                    state.isCharging == true -> Success
                    state.isCharging == false -> Warning
                    else -> Warning
                },
                detail = state.chargingSource ?: "-"
            )
            ReadinessChip(
                icon = Icons.Outlined.WifiTethering,
                label = if (hasLan) "Network OK" else "No LAN",
                tone = if (hasLan && networkOk) Success else Warning,
                detail = state.localIp ?: "-"
            )
        }
        Spacer(Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            ReadinessChip(
                icon = Icons.Outlined.PlayArrow,
                label = if (state.running) "Serving" else "Stopped",
                tone = if (state.running) Success else Error,
                detail = if (state.running) ":17777/:17778" else "start runtime"
            )
            ReadinessChip(
                icon = Icons.Outlined.Shield,
                label = when (state.isBatteryOptimizationExempt) {
                    true -> "Exempted"
                    false -> "Not exempted"
                    else -> "Unknown"
                },
                tone = when (state.isBatteryOptimizationExempt) {
                    true -> Success
                    false -> Warning
                    else -> Warning
                },
                detail = "battery opt"
            )
        }
        Spacer(Modifier.height(8.dp))
        if (state.running && state.isCharging != true) {
            Text(
                text = "Connect power for reliable semi-headless serving. Without charging, long-running node duty is not reliable.",
                color = Warning,
                style = MaterialTheme.typography.bodySmall
            )
        }
        if (state.running && state.isBatteryOptimizationExempt != true) {
            Text(
                text = "Battery optimization may kill the runtime in the background. Consider exempting this app from battery optimization in Android settings.",
                color = Warning,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun ReadinessChip(
    icon: ImageVector,
    label: String,
    tone: Color,
    detail: String
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(tone.copy(alpha = 0.12f), MaterialTheme.shapes.small),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = tone, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.height(4.dp))
        Text(label, color = tone, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
        Text(detail, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall, fontSize = 10.sp)
    }
}

private fun buildNodeStats(snapshot: GatewaySnapshot?): List<Stat> {
    val discovery = snapshot?.discovery
    val health = snapshot?.health
    val capabilities = snapshot?.capabilities
    val cluster = snapshot?.cluster
    val system = snapshot?.system
    if (discovery == null) return emptyList()

    return listOf(
        Stat(
            label = "Platform",
            value = discovery.os.ifBlank { "unknown" },
            supporting = discovery.arch.ifBlank { "arch unknown" },
            tone = Accent
        ),
        Stat(
            label = "LAN",
            value = discovery.ip.ifBlank { "n/a" },
            supporting = "${cluster?.nodes?.size ?: 1} known nodes",
            tone = Success
        ),
        Stat(
            label = if (discovery.gpuName != null) "GPU" else "Memory",
            value = discovery.gpuName ?: formatBytes(discovery.ramBytes ?: system?.totalRamBytes),
            supporting = discovery.gpuVramMb?.let { "${it / 1024}GB VRAM" } ?: "system RAM",
            tone = if (discovery.gpuName != null) Success else Warning
        ),
        Stat(
            label = if (system?.freeStorageBytes != null) "Storage" else "Models",
            value = system?.freeStorageBytes?.let { formatBytes(it) } ?: "${discovery.models.size}",
            supporting = when {
                system?.totalStorageBytes != null && system.batteryPercent != null ->
                    "${formatBytes(system.totalStorageBytes)} total · ${system.batteryPercent}% battery"
                system?.totalStorageBytes != null ->
                    "${formatBytes(system.totalStorageBytes)} total"
                system?.batteryPercent != null ->
                    "${system.batteryPercent}% battery"
                else -> "${capabilities?.details?.size ?: health?.capabilityModels?.size ?: 0} capability bindings"
            },
            tone = if (system?.freeStorageBytes != null) Success else Accent
        )
    )
}

private fun formatBytes(bytes: Long?): String {
    if (bytes == null || bytes <= 0L) return "n/a"
    val gib = bytes / (1024.0 * 1024.0 * 1024.0)
    return if (gib >= 10) {
        String.format(Locale.US, "%.0f GB", gib)
    } else {
        String.format(Locale.US, "%.1f GB", gib)
    }
}

private fun trustTone(status: String): Color = when (status) {
    "trusted" -> Success
    "mismatch" -> Error
    "missing_ca", "missing_server" -> Warning
    else -> Accent
}

private fun localSetupLoopbackUrl(): String = "http://127.0.0.1:${LocalNodeRuntime.SETUP_PORT}"

private fun localCommandCenterLoopbackUrl(state: LocalRuntimeState): String = "https://127.0.0.1:${state.port}"

private fun localLanUrl(state: LocalRuntimeState): String? =
    state.localIp?.takeIf { it.isNotBlank() }?.let { "https://$it:${state.port}" }

private fun relativeClientSeen(lastSeenMillis: Long): String {
    val ageSeconds = ((System.currentTimeMillis() - lastSeenMillis) / 1000L).coerceAtLeast(0L)
    return when {
        ageSeconds < 5 -> "just now"
        ageSeconds < 60 -> "${ageSeconds}s ago"
        ageSeconds < 3600 -> "${ageSeconds / 60}m ago"
        else -> "${ageSeconds / 3600}h ago"
    }
}
