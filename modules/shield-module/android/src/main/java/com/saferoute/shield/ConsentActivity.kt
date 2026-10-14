package com.saferoute.shield

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionConfig
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle

class ConsentActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
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
            finishWith(false)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        val granted = requestCode == REQUEST_CODE && resultCode == RESULT_OK && data != null
        if (granted && data != null) {
            ShieldBridge.pendingConsent = ShieldBridge.Consent(resultCode, data)
        }
        finishWith(granted)
    }

    private fun finishWith(granted: Boolean) {
        val service = ShieldService.instance
        if (granted) service?.onConsentGranted() else service?.onConsentDenied()
        val callback = ShieldBridge.consentCallback
        ShieldBridge.consentCallback = null
        callback?.invoke(granted)
        finish()
    }

    companion object {
        private const val REQUEST_CODE = 4401
    }
}
