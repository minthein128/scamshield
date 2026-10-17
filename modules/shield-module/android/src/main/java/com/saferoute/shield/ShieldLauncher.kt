package com.saferoute.shield

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/** Starts and stops the shield service. The app's switch and the Quick Settings tile share it. */
internal object ShieldLauncher {

    /** Starts the service in the foreground. Throws when Android refuses a foreground-service start. */
    fun start(context: Context, config: ShieldStartConfig) {
        ShieldBridge.shareSignals = config.shareSignals
        ShieldBridge.homeCountry = config.home
        ShieldBridge.destinationCountry = config.destination
        if (config.strings.isNotEmpty()) ShieldBridge.strings = ShieldStrings.from(config.strings)
        val intent = Intent(context, ShieldService::class.java).apply {
            action = ShieldService.ACTION_START
            putExtra(ShieldService.EXTRA_API_URL, config.apiUrl)
            putExtra(ShieldService.EXTRA_FALLBACK_API_URL, config.fallbackApiUrl)
            config.language?.let { putExtra(ShieldService.EXTRA_LANGUAGE, it) }
        }
        ContextCompat.startForegroundService(context, intent)
    }

    /** Removes the bubble and reports the stop at once when the service runs in this process. */
    fun stop(context: Context) {
        val service = ShieldService.instance
        if (service != null) service.stopNow() else context.stopService(Intent(context, ShieldService::class.java))
    }
}
