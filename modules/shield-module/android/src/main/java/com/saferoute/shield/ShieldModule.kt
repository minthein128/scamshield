package com.saferoute.shield

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ShieldModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("ShieldModule")

        AsyncFunction("hasOverlayPermission") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(context)
            } else {
                true
            }
        }

        AsyncFunction("requestOverlayPermission") {
            val activity = appContext.currentActivity ?: return@AsyncFunction false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(activity)) {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:${activity.packageName}")
                    )
                    activity.startActivity(intent)
                    return@AsyncFunction true
                }
            }
            false
        }

        AsyncFunction("startShield") { options: Map<String, Any>? ->
            val context = appContext.reactContext ?: return@AsyncFunction false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                return@AsyncFunction false
            }
            val intent = Intent(context, ShieldService::class.java).apply {
                action = ShieldService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, intent)
            } else {
                context.startService(intent)
            }
            true
        }

        AsyncFunction("stopShield") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            val intent = Intent(context, ShieldService::class.java).apply {
                action = ShieldService.ACTION_STOP
            }
            context.stopService(intent)
            true
        }

        AsyncFunction("isShieldRunning") {
            ShieldService.isRunning
        }
    }
}
