package com.saferoute.shield

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.util.Log

/** What a tap on the Quick Settings tile does. */
internal enum class TileAction { STOP, START, OPEN_SETUP }

/** Pure tile rules, kept apart from the service so tests can cover them. */
internal object ShieldTileLogic {
    fun state(running: Boolean): Int = if (running) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE

    /** Off with no overlay permission or no saved start options means the app must finish setup first. */
    fun action(running: Boolean, canDrawOverlays: Boolean, configured: Boolean): TileAction = when {
        running -> TileAction.STOP
        !canDrawOverlays || !configured -> TileAction.OPEN_SETUP
        else -> TileAction.START
    }

    fun label(config: ShieldStartConfig?, fallback: String): String =
        config?.strings?.get("a11yShield")?.takeIf { it.isNotBlank() } ?: fallback
}

/** "Kakwe shield" Quick Settings tile: turns the floating bubble on and off. It never asks for screen capture. */
class ShieldTileService : TileService() {

    private val main = Handler(Looper.getMainLooper())
    private val stateListener: (Boolean) -> Unit = { running -> main.post { render(running) } }

    override fun onStartListening() {
        super.onStartListening()
        ShieldBridge.addStateListener(stateListener)
        render(ShieldService.isRunning)
    }

    override fun onStopListening() {
        ShieldBridge.removeStateListener(stateListener)
        super.onStopListening()
    }

    override fun onClick() {
        super.onClick()
        if (isLocked) unlockAndRun { handleClick() } else handleClick()
    }

    private fun handleClick() {
        val config = ShieldStartConfig.load(this)
        when (ShieldTileLogic.action(ShieldService.isRunning, Settings.canDrawOverlays(this), config != null)) {
            TileAction.STOP -> {
                ShieldLauncher.stop(this)
                render(false)
            }
            TileAction.OPEN_SETUP -> openSetup()
            TileAction.START -> try {
                ShieldLauncher.start(this, config!!)
                render(true)
            } catch (e: Exception) {
                Log.w(TAG, "tile start refused: ${e.javaClass.simpleName}")
                openSetup()
            }
        }
    }

    private fun render(running: Boolean) {
        val tile = qsTile ?: return
        val label = ShieldTileLogic.label(ShieldStartConfig.load(this), getString(R.string.kakwe_shield_tile))
        tile.state = ShieldTileLogic.state(running)
        tile.label = label
        tile.contentDescription = label
        tile.icon = Icon.createWithResource(this, R.drawable.ic_kakwe_tile)
        tile.updateTile()
    }

    /** Opens the Shield screen in the app and collapses the shade. */
    private fun openSetup() {
        val intent = setupIntent(this)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val pending = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                startActivityAndCollapse(pending)
            } else {
                @Suppress("DEPRECATION")
                startActivityAndCollapse(intent)
            }
        } catch (e: Exception) {
            Log.w(TAG, "collapse failed: ${e.javaClass.simpleName}")
            runCatching { startActivity(intent) }
        }
    }

    companion object {
        private const val TAG = "ShieldTile"

        fun setupIntent(context: Context): Intent =
            Intent(Intent.ACTION_VIEW, Uri.parse("saferoute://shield"))
                .setPackage(context.packageName)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
}
