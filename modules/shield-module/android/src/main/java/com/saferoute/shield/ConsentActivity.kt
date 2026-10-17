package com.saferoute.shield

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionConfig
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import java.lang.ref.WeakReference

/** Shows the system screen-capture dialog for one bubble tap and hands the result to the service. */
class ConsentActivity : Activity() {

    private var requestId = 0
    private var delivered = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestId = intent?.getIntExtra(EXTRA_REQUEST_ID, 0) ?: 0
        delivered = savedInstanceState?.getBoolean(STATE_DELIVERED) ?: false
        current?.get()?.takeIf { it !== this }?.abandon()
        current = WeakReference(this)
        if (savedInstanceState != null) return
        try {
            val manager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                manager.createScreenCaptureIntent(MediaProjectionConfig.createConfigForDefaultDisplay())
            } else {
                manager.createScreenCaptureIntent()
            }
            startActivityForResult(intent, REQUEST_CODE)
        } catch (e: Exception) {
            finishWith(null)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean(STATE_DELIVERED, delivered)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_CODE) return
        val granted = resultCode == RESULT_OK && data != null
        finishWith(if (granted && data != null) ShieldBridge.Consent(resultCode, data) else null)
    }

    /** A newer tap replaced this request: close its dialog without telling the service. */
    private fun abandon() {
        delivered = true
        runCatching { finishActivity(REQUEST_CODE) }
        finish()
    }

    private fun finishWith(consent: ShieldBridge.Consent?) {
        if (!delivered) {
            delivered = true
            ShieldService.instance?.onConsentResult(requestId, consent)
        }
        finish()
        @Suppress("DEPRECATION")
        overridePendingTransition(0, 0)
    }

    override fun onDestroy() {
        if (isFinishing && !delivered) {
            delivered = true
            ShieldService.instance?.onConsentResult(requestId, null)
        }
        if (current?.get() === this) current = null
        super.onDestroy()
    }

    companion object {
        const val EXTRA_REQUEST_ID = "consentRequestId"
        private const val REQUEST_CODE = 4401
        private const val STATE_DELIVERED = "delivered"
        private var current: WeakReference<ConsentActivity>? = null
    }
}
