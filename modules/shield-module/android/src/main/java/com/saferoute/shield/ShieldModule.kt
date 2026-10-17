package com.saferoute.shield

import android.app.StatusBarManager
import android.content.ComponentName
import android.content.Intent
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ShieldModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("ShieldModule")

        Events("onShieldResult", "onShieldState")

        OnCreate {
            ShieldBridge.eventSink = { id, json ->
                this@ShieldModule.sendEvent("onShieldResult", mapOf("id" to id, "json" to json))
            }
            ShieldBridge.stateSink = { running ->
                this@ShieldModule.sendEvent("onShieldState", mapOf("running" to running))
            }
            appContext.reactContext?.let { LegacyDataCleanup.run(it) }
        }

        OnDestroy {
            ShieldBridge.eventSink = null
            ShieldBridge.stateSink = null
        }

        OnActivityEntersForeground {
            ShieldService.instance?.armVoice()
        }

        AsyncFunction("hasOverlayPermission") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            Settings.canDrawOverlays(context)
        }

        AsyncFunction("requestOverlayPermission") {
            val context = appContext.currentActivity ?: appContext.reactContext ?: return@AsyncFunction false
            if (Settings.canDrawOverlays(context)) return@AsyncFunction true
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${context.packageName}")
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                context.startActivity(intent)
                true
            } catch (e: Exception) {
                false
            }
        }

        AsyncFunction("startShield") { options: Map<String, Any?>? ->
            val context = appContext.reactContext ?: return@AsyncFunction false
            if (!Settings.canDrawOverlays(context)) return@AsyncFunction false
            ShieldBridge.authToken = (options?.get("authToken") as? String).orEmpty()
            val config = ShieldStartConfig.fromOptions(options)
            ShieldStartConfig.save(context, config)
            ShieldLauncher.start(context, config)
            true
        }

        AsyncFunction("setShareSignals") { enabled: Boolean ->
            ShieldBridge.shareSignals = enabled
            appContext.reactContext?.let { ShieldStartConfig.saveShareSignals(it, enabled) }
            true
        }

        AsyncFunction("quickSettingsTileSupport") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) "request" else "manual"
        }

        AsyncFunction("requestAddTile") { label: String?, promise: Promise ->
            val context = appContext.currentActivity ?: appContext.reactContext
            if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                promise.resolve("unsupported")
                return@AsyncFunction
            }
            val manager = context.getSystemService(StatusBarManager::class.java)
            if (manager == null) {
                promise.resolve("unsupported")
                return@AsyncFunction
            }
            val name = label?.trim()?.takeIf { it.isNotEmpty() } ?: context.getString(R.string.kakwe_shield_tile)
            try {
                manager.requestAddTileService(
                    ComponentName(context, ShieldTileService::class.java),
                    name,
                    Icon.createWithResource(context, R.drawable.ic_kakwe_tile),
                    context.mainExecutor
                ) { result -> promise.resolve(tileRequestResult(result)) }
            } catch (e: Exception) {
                promise.resolve("error")
            }
        }

        AsyncFunction("setAuthToken") { token: String? ->
            ShieldBridge.authToken = token.orEmpty()
            true
        }

        AsyncFunction("stopShield") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            ShieldLauncher.stop(context)
            true
        }.runOnQueue(Queues.MAIN)

        AsyncFunction("isShieldRunning") {
            ShieldService.isRunning
        }

        AsyncFunction("checkScreenNow") {
            val service = ShieldService.instance
                ?: throw CodedException("ERR_SHIELD_NOT_RUNNING", "Shield is not running", null)
            service.requestCheck()
        }

        AsyncFunction("getShieldResult") { id: String ->
            ShieldBridge.recentResult(id)
        }

        AsyncFunction("takeUnsyncedResults") {
            ShieldBridge.takeUnsynced()
        }
    }

    companion object {
        /** Maps a StatusBarManager tile request result to the JS result name. */
        fun tileRequestResult(code: Int): String = when (code) {
            StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED -> "added"
            StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED -> "already"
            StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_NOT_ADDED -> "declined"
            else -> "error"
        }
    }
}
