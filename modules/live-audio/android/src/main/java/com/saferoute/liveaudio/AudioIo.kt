package com.saferoute.liveaudio

interface PcmSource {
    fun start()
    /** Blocking read. Returns samples read, or a negative value on error. */
    fun read(buf: ShortArray, count: Int): Int
    fun stop()
    fun release()
}

interface PcmSink {
    fun play()
    /** Non-blocking write. Returns bytes accepted, which may be 0 when the buffer is full. */
    fun write(buf: ByteArray, offset: Int, length: Int): Int
    fun pauseAndFlush()
    fun release()
}

interface AudioSession {
    fun begin()
    fun end()
}
