package com.saferoute.liveaudio

class CaptureEngine(
    private val source: PcmSource,
    private val meter: LevelMeter,
    private val onChunk: (String) -> Unit,
    private val onFailure: (String) -> Unit = {},
) {
    private var thread: Thread? = null
    @Volatile private var running = false

    val isRunning: Boolean get() = running

    @Synchronized
    fun start() {
        if (running) return
        running = true
        source.start()
        val assembler = FrameAssembler { frame ->
            meter.update(Pcm.rms(frame))
            onChunk(Pcm.encode(frame))
        }
        thread = Thread({
            val buf = ShortArray(Pcm.FRAME_SAMPLES)
            while (running) {
                val n = source.read(buf, buf.size)
                if (n < 0) {
                    if (running) onFailure("AudioRecord read failed: $n")
                    break
                }
                if (n > 0) assembler.push(buf, n)
            }
        }, "live-audio-capture").also { it.start() }
    }

    @Synchronized
    fun stop() {
        running = false
        runCatching { source.stop() }
        thread?.join(500)
        thread = null
        runCatching { source.release() }
        meter.reset()
    }
}
