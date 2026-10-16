package com.saferoute.shield

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ShareSignalsTest {

    @After
    fun reset() {
        ShieldBridge.shareSignals = false
    }

    @Test
    fun screenChecksDoNotShareUnlessTheUserOptedIn() {
        assertFalse("off by default", ShieldBridge.shareSignals)
        val body = CheckClient.requestBody("my", byteArrayOf(1, 2, 3))
        assertTrue("always sent explicitly", body.has("shareSignals"))
        assertFalse(body.getBoolean("shareSignals"))
        assertEquals("screen", body.getString("kind"))
    }

    @Test
    fun anOptInIsSentAsTrue() {
        ShieldBridge.shareSignals = true
        val body = CheckClient.requestBody("en", byteArrayOf(1), ShieldBridge.shareSignals)
        assertTrue(body.getBoolean("shareSignals"))
    }
}
