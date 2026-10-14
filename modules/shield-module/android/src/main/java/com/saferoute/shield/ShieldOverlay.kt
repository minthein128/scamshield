package com.saferoute.shield

import android.annotation.SuppressLint
import android.content.Context
import android.content.ContextWrapper
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.min

/** Floating ball plus result card, all built in code. Every method must run on the main thread. */
class ShieldOverlay(private val context: Context, private val listener: Listener) {

    interface Listener {
        fun onBallTap()
        fun onOpenReport()
        fun onDismiss()
    }

    enum class State { IDLE, CHECKING, SAFE, CAREFUL, DANGER, ERROR }

    var state = State.IDLE
        private set

    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val density = context.resources.displayMetrics.density
    private val themed = object : ContextWrapper(context) {
        override fun getTheme(): android.content.res.Resources.Theme {
            val t = super.getTheme()
            t.applyStyle(android.R.style.Theme_DeviceDefault_Light, true)
            return t
        }
    }
    private val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_PHONE
    }

    private val ballSize = dp(60)
    private val ballBackground = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(COLOR_IDLE)
        setStroke(dp(3), Color.WHITE)
    }
    private val spinner = ProgressBar(themed).apply {
        isIndeterminate = true
        visibility = View.GONE
        indeterminateTintList = android.content.res.ColorStateList.valueOf(Color.WHITE)
    }
    private val ball = FrameLayout(context)
    private val ballParams = WindowManager.LayoutParams(
        ballSize,
        ballSize,
        overlayType,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        PixelFormat.TRANSLUCENT
    ).apply {
        gravity = Gravity.TOP or Gravity.START
        x = context.resources.displayMetrics.widthPixels - ballSize - dp(24)
        y = (context.resources.displayMetrics.heightPixels * 0.35).toInt()
    }

    private var card: View? = null
    private var cardHidden = false
    private var ballAttached = false

    @SuppressLint("ClickableViewAccessibility")
    fun show() {
        if (ballAttached) return
        ball.background = ballBackground
        ball.elevation = dp(12).toFloat()
        val inset = dp(15)
        ball.addView(ShieldIcon(context), FrameLayout.LayoutParams(ballSize, ballSize).apply {
            setMargins(inset, inset, inset, inset)
            width = ballSize - 2 * inset
            height = ballSize - 2 * inset
            gravity = Gravity.CENTER
        })
        ball.addView(spinner, FrameLayout.LayoutParams(ballSize - dp(8), ballSize - dp(8), Gravity.CENTER))
        ball.setOnTouchListener(dragListener())
        windowManager.addView(ball, ballParams)
        ballAttached = true
    }

    fun remove() {
        removeCard()
        if (ballAttached) {
            try {
                windowManager.removeView(ball)
            } catch (_: Exception) {
            }
            ballAttached = false
        }
    }

    fun hideForCapture() {
        ball.visibility = View.INVISIBLE
        card?.visibility = View.INVISIBLE
    }

    fun setChecking() {
        removeCard()
        state = State.CHECKING
        ball.visibility = View.VISIBLE
        spinner.visibility = View.VISIBLE
        ballBackground.setColor(COLOR_IDLE)
    }

    fun setResult(json: JSONObject) {
        val verdict = json.optString("verdict")
        state = when (verdict) {
            "safe" -> State.SAFE
            "danger" -> State.DANGER
            else -> State.CAREFUL
        }
        val color = colorFor(state)
        ball.visibility = View.VISIBLE
        spinner.visibility = View.GONE
        ballBackground.setColor(color)
        showCard(
            color = color,
            title = json.optString("title").ifBlank { verdict.replaceFirstChar { it.uppercase() } },
            summary = json.optString("summary"),
            flags = flagLines(json),
            canOpenReport = true
        )
    }

    fun setError(message: String) {
        state = State.ERROR
        ball.visibility = View.VISIBLE
        spinner.visibility = View.GONE
        ballBackground.setColor(COLOR_ERROR)
        showCard(COLOR_ERROR, "Could not check", message, emptyList(), false)
    }

    fun reset() {
        removeCard()
        state = State.IDLE
        ball.visibility = View.VISIBLE
        spinner.visibility = View.GONE
        ballBackground.setColor(COLOR_IDLE)
    }

    fun toggleCard() {
        val c = card ?: return
        cardHidden = !cardHidden
        c.visibility = if (cardHidden) View.GONE else View.VISIBLE
    }

    private fun flagLines(json: JSONObject): List<String> {
        val flags = json.optJSONArray("flags") ?: return emptyList()
        val lines = ArrayList<String>()
        for (i in 0 until min(3, flags.length())) {
            val flag = flags.optJSONObject(i) ?: continue
            val label = flag.optString("label")
            val evidence = flag.optString("evidence")
            val line = if (evidence.isBlank()) label else "$label: $evidence"
            if (line.isNotBlank()) lines.add(line)
        }
        return lines
    }

    private fun showCard(color: Int, title: String, summary: String, flags: List<String>, canOpenReport: Boolean) {
        removeCard()
        val metrics = context.resources.displayMetrics
        val width = min(metrics.widthPixels - dp(32), dp(360))

        val root = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable().apply {
                cornerRadius = dp(16).toFloat()
                setColor(Color.WHITE)
                setStroke(dp(3), color)
            }
            elevation = dp(16).toFloat()
            setPadding(dp(16), dp(14), dp(16), dp(12))
        }
        root.addView(label(title, 18f, color, bold = true))
        if (summary.isNotBlank()) root.addView(label(summary, 14f, TEXT_DARK, topMargin = dp(6)))
        for (line in flags) {
            root.addView(label("• $line", 13f, TEXT_MUTED, topMargin = dp(6), maxLines = 3))
        }
        val buttons = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
        }
        buttons.addView(button("Dismiss", Color.TRANSPARENT, TEXT_MUTED) { listener.onDismiss() })
        if (canOpenReport) {
            buttons.addView(button("Open full report", color, Color.WHITE) { listener.onOpenReport() })
        }
        root.addView(buttons, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(10) })

        val params = WindowManager.LayoutParams(
            width,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = dp(72)
        }
        try {
            windowManager.addView(root, params)
            card = root
            cardHidden = false
        } catch (_: Exception) {
            card = null
        }
    }

    private fun removeCard() {
        val c = card ?: return
        try {
            windowManager.removeView(c)
        } catch (_: Exception) {
        }
        card = null
        cardHidden = false
    }

    private fun label(
        text: String,
        sp: Float,
        color: Int,
        bold: Boolean = false,
        topMargin: Int = 0,
        maxLines: Int = 6
    ): TextView = TextView(context).apply {
        this.text = text
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
        setTextColor(color)
        if (bold) setTypeface(typeface, Typeface.BOLD)
        this.maxLines = maxLines
        ellipsize = TextUtils.TruncateAt.END
        layoutParams = LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply { this.topMargin = topMargin }
    }

    private fun button(text: String, background: Int, textColor: Int, onClick: () -> Unit): Button =
        Button(themed).apply {
            this.text = text
            isAllCaps = false
            setTextColor(textColor)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            this.background = GradientDrawable().apply {
                cornerRadius = dp(10).toFloat()
                setColor(background)
            }
            minHeight = 0
            minimumHeight = dp(40)
            setPadding(dp(14), 0, dp(14), 0)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { marginStart = dp(8) }
            setOnClickListener { onClick() }
        }

    @SuppressLint("ClickableViewAccessibility")
    private fun dragListener() = object : View.OnTouchListener {
        private var startX = 0
        private var startY = 0
        private var touchX = 0f
        private var touchY = 0f
        private var moved = false

        override fun onTouch(v: View, event: MotionEvent): Boolean {
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    startX = ballParams.x
                    startY = ballParams.y
                    touchX = event.rawX
                    touchY = event.rawY
                    moved = false
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - touchX).toInt()
                    val dy = (event.rawY - touchY).toInt()
                    if (abs(dx) > dp(6) || abs(dy) > dp(6)) moved = true
                    if (moved) {
                        ballParams.x = startX + dx
                        ballParams.y = startY + dy
                        try {
                            windowManager.updateViewLayout(ball, ballParams)
                        } catch (_: Exception) {
                        }
                    }
                    return true
                }
                MotionEvent.ACTION_UP -> {
                    if (!moved) listener.onBallTap()
                    return true
                }
            }
            return false
        }
    }

    private fun colorFor(s: State): Int = when (s) {
        State.SAFE -> COLOR_SAFE
        State.CAREFUL -> COLOR_CAREFUL
        State.DANGER -> COLOR_DANGER
        State.ERROR -> COLOR_ERROR
        else -> COLOR_IDLE
    }

    private fun dp(value: Int): Int = (value * density).toInt()

    private class ShieldIcon(context: Context) : View(context) {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
        private val path = Path()

        override fun onDraw(canvas: Canvas) {
            val w = width.toFloat()
            val h = height.toFloat()
            path.reset()
            path.moveTo(w * 0.5f, h * 0.02f)
            path.lineTo(w * 0.92f, h * 0.18f)
            path.lineTo(w * 0.92f, h * 0.50f)
            path.quadTo(w * 0.92f, h * 0.86f, w * 0.5f, h * 0.98f)
            path.quadTo(w * 0.08f, h * 0.86f, w * 0.08f, h * 0.50f)
            path.lineTo(w * 0.08f, h * 0.18f)
            path.close()
            canvas.drawPath(path, paint)
        }
    }

    companion object {
        private val COLOR_IDLE = Color.parseColor("#1D4ED8")
        private val COLOR_SAFE = Color.parseColor("#16A34A")
        private val COLOR_CAREFUL = Color.parseColor("#D97706")
        private val COLOR_DANGER = Color.parseColor("#DC2626")
        private val COLOR_ERROR = Color.parseColor("#475569")
        private val TEXT_DARK = Color.parseColor("#0F1B2D")
        private val TEXT_MUTED = Color.parseColor("#475569")
    }
}
