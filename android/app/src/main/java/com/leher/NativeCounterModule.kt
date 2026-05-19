package com.leher

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.atomic.AtomicInteger

@ReactModule(name = NativeCounterSpec.NAME)
class NativeCounterModule(reactContext: ReactApplicationContext) :
    NativeCounterSpec(reactContext) {

    companion object {
        private const val BONUS_EVERY_N = 5
    }

    private val value = AtomicInteger(0)
    private val pressCount = AtomicInteger(0)
    private var listenerCount = 0

    override fun increment(): Double {
        val newPress = pressCount.incrementAndGet()
        val step = if (newPress % BONUS_EVERY_N == 0) BONUS_EVERY_N else 1
        val newValue = value.addAndGet(step)
        emit(newValue, newPress)
        return newValue.toDouble()
    }

    override fun decrement(): Double {
        while (true) {
            val cur = value.get()
            if (cur <= 0) return 0.0
            if (value.compareAndSet(cur, cur - 1)) {
                val newValue = cur - 1
                emit(newValue, pressCount.get())
                return newValue.toDouble()
            }
        }
    }

    override fun reset(): Double {
        value.set(0)
        pressCount.set(0)
        emit(0, 0)
        return 0.0
    }

    override fun getValue(): Double = value.get().toDouble()

    override fun addListener(eventName: String) { listenerCount++ }

    override fun removeListeners(count: Double) {
        listenerCount = maxOf(0, listenerCount - count.toInt())
    }

    private fun emit(newValue: Int, newPressCount: Int) {
        if (listenerCount <= 0) return
        val params = Arguments.createMap().apply {
            putInt("value", newValue)
            putInt("pressCount", newPressCount)
        }
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("onCounterChange", params)
    }
}
