package com.saferoute.shield

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class LegacyDataCleanupTest {
    private lateinit var context: Context
    private lateinit var manager: NotificationManager
    private val legacyFiles = listOf("results.json", "sent_log.json", "activity.json", "sent_log.json.tmp")

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        manager = context.getSystemService(NotificationManager::class.java)
    }

    private fun seed(): List<File> {
        val files = listOf(context.noBackupFilesDir, context.filesDir).flatMap { base ->
            val dir = File(base, LegacyDataCleanup.LEGACY_DIR).apply { mkdirs() }
            legacyFiles.map { File(dir, it).apply { writeText("[{\"text\":\"Pay the fee at [LINK]\"}]") } }
        }
        context.getSharedPreferences(LegacyDataCleanup.LEGACY_PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean("enabled", true).putInt("consentVersion", 1).commit()
        LegacyDataCleanup.LEGACY_CHANNELS.forEach {
            manager.createNotificationChannel(NotificationChannel(it, it, NotificationManager.IMPORTANCE_DEFAULT))
        }
        return files
    }

    private fun legacyPrefsFile() = File(context.dataDir, "shared_prefs/${LegacyDataCleanup.LEGACY_PREFS}.xml")

    @Test
    fun deletesLegacyFilesPreferencesAndChannels() {
        val files = seed()
        assertTrue(files.all { it.exists() })
        assertTrue(legacyPrefsFile().exists())
        LegacyDataCleanup.LEGACY_CHANNELS.forEach { assertEquals(it, manager.getNotificationChannel(it)?.id) }

        LegacyDataCleanup.run(context)

        assertTrue("files gone", files.none { it.exists() })
        listOf(context.noBackupFilesDir, context.filesDir).forEach {
            assertFalse("dir gone", File(it, LegacyDataCleanup.LEGACY_DIR).exists())
        }
        assertFalse("prefs file gone", legacyPrefsFile().exists())
        assertTrue(context.getSharedPreferences(LegacyDataCleanup.LEGACY_PREFS, Context.MODE_PRIVATE).all.isEmpty())
        LegacyDataCleanup.LEGACY_CHANNELS.forEach { assertNull(it, manager.getNotificationChannel(it)) }
    }

    @Test
    fun runsOnlyOnce() {
        LegacyDataCleanup.run(context)
        val files = seed()

        LegacyDataCleanup.run(context)

        assertTrue("second run is a no-op", files.all { it.exists() })
    }

    @Test
    fun doesNotThrowWithNothingToDelete() {
        LegacyDataCleanup.run(context)
        LegacyDataCleanup.run(context)
    }
}
