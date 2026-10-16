package com.saferoute.shield

import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ShieldModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("ShieldModule")

        Events("onShieldResult")

        OnCreate {
            ShieldBridge.eventSink = { id, json ->
                this@ShieldModule.sendEvent("onShieldResult", mapOf("id" to id, "json" to json))
            }
        }

        OnDestroy {
            ShieldBridge.eventSink = null
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
            context.startActivity(intent)
            false
        }

        AsyncFunction("requestScreenCapturePermission") { promise: Promise ->
            if (ShieldBridge.hasProjection()) {
                promise.resolve(true)
                return@AsyncFunction
            }
            val context = appContext.currentActivity ?: appContext.reactContext
            if (context == null) {
                promise.resolve(false)
                return@AsyncFunction
            }
            ShieldBridge.consentCallback = { granted -> promise.resolve(granted) }
            try {
                context.startActivity(
                    Intent(context, ConsentActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            } catch (e: Exception) {
                ShieldBridge.consentCallback = null
                promise.resolve(false)
            }
        }

        AsyncFunction("startShield") { options: Map<String, Any?>? ->
            val context = appContext.reactContext ?: return@AsyncFunction false
            if (!Settings.canDrawOverlays(context)) return@AsyncFunction false
            ShieldBridge.authToken = (options?.get("authToken") as? String).orEmpty()
            ShieldBridge.shareSignals = options?.get("shareSignals") == true
            ShieldBridge.homeCountry = ShieldBridge.countryCode(options?.get("home"))
            ShieldBridge.destinationCountry = ShieldBridge.countryCode(options?.get("destination"))
            @Suppress("UNCHECKED_CAST")
            (options?.get("strings") as? Map<String, Any?>)?.let { ShieldBridge.strings = ShieldStrings.from(it) }
            val intent = Intent(context, ShieldService::class.java).apply {
                action = ShieldService.ACTION_START
                putExtra(ShieldService.EXTRA_API_URL, options?.get("apiUrl") as? String ?: "")
                (options?.get("language") as? String)?.let { putExtra(ShieldService.EXTRA_LANGUAGE, it) }
            }
            ContextCompat.startForegroundService(context, intent)
            true
        }

        AsyncFunction("setShareSignals") { enabled: Boolean ->
            ShieldBridge.shareSignals = enabled
            true
        }

        AsyncFunction("setAuthToken") { token: String? ->
            ShieldBridge.authToken = token.orEmpty()
            true
        }

        AsyncFunction("stopShield") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            context.stopService(Intent(context, ShieldService::class.java))
            true
        }

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
                ?: appContext.reactContext?.let { MessageGuardStore(it).result(id) }
        }

        AsyncFunction("takeUnsyncedResults") {
            ShieldBridge.takeUnsynced()
        }

        AsyncFunction("hasNotificationAccess") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
        }

        AsyncFunction("openNotificationAccessSettings") {
            val context = appContext.currentActivity ?: appContext.reactContext ?: return@AsyncFunction false
            val detail = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).putExtra(
                    Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                    ComponentName(context, MessageGuardListener::class.java).flattenToString()
                )
            } else {
                null
            }
            val list = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            for (intent in listOfNotNull(detail, list)) {
                try {
                    context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    return@AsyncFunction true
                } catch (e: Exception) {
                    continue
                }
            }
            false
        }

        AsyncFunction("setMessageGuardEnabled") { enabled: Boolean ->
            val context = appContext.reactContext ?: return@AsyncFunction false
            MessageGuardBridge.setEnabled(context, enabled)
        }

        AsyncFunction("isMessageGuardEnabled") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            MessageGuardStore(context).enabled
        }

        AsyncFunction("getMessageGuardStatus") {
            val context = appContext.reactContext ?: return@AsyncFunction null
            MessageGuardBridge.status(context)
        }

        AsyncFunction("grantMessageGuardConsent") { ids: List<String> ->
            val context = appContext.reactContext ?: return@AsyncFunction false
            MessageGuardBridge.grantConsent(context, ids)
        }

        AsyncFunction("setMessageGuardApps") { ids: List<String> ->
            val context = appContext.reactContext ?: return@AsyncFunction false
            MessageGuardBridge.keepApps(context, ids)
        }

        AsyncFunction("getMessageGuardApps") {
            val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
            MessageGuardBridge.apps(context)
        }

        AsyncFunction("configureMessageGuard") { options: Map<String, Any?> ->
            val context = appContext.reactContext ?: return@AsyncFunction false
            MessageGuardBridge.configure(context, options)
        }

        AsyncFunction("getMessageGuardLog") {
            val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
            MessageGuardBridge.log(context)
        }

        AsyncFunction("clearMessageGuardLog") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            MessageGuardBridge.clearLog(context)
        }
    }
}
