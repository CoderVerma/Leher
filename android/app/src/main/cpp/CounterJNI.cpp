/**
 * CounterJNI.cpp
 *
 * JNI bridge between the Kotlin TurboModule and the shared C++ CounterCore.
 *
 * Each CounterCore instance is heap-allocated and its address is passed back
 * to Kotlin as a jlong "handle".  The Kotlin module is responsible for calling
 * nativeDestroy when it is invalidated.
 *
 * The onChange callback fires on the calling thread (JS thread in new arch).
 * It holds a global JNI reference to the Kotlin CounterCallback interface and
 * calls its onChanged(int) method directly.
 */

#include <jni.h>
#include <android/log.h>
#include "CounterCore.h"

#define LOG_TAG "NativeCounterJNI"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

using namespace leher;

// JNI method naming: Java_<package_underscored>_<ClassName>_<methodName>
// Package: com.leher  →  com_leher
// Class:   NativeCounterModule

extern "C" {

// ─── Lifecycle ────────────────────────────────────────────────────────────────

JNIEXPORT jlong JNICALL
Java_com_leher_NativeCounterModule_nativeCreate(JNIEnv *env, jobject /*thiz*/) {
  return reinterpret_cast<jlong>(new CounterCore());
}

JNIEXPORT void JNICALL
Java_com_leher_NativeCounterModule_nativeDestroy(JNIEnv *env, jobject /*thiz*/, jlong handle) {
  delete reinterpret_cast<CounterCore *>(handle);
}

// ─── Counter operations ───────────────────────────────────────────────────────

JNIEXPORT jint JNICALL
Java_com_leher_NativeCounterModule_nativeIncrement(JNIEnv *env, jobject /*thiz*/, jlong handle) {
  return reinterpret_cast<CounterCore *>(handle)->increment();
}

JNIEXPORT jint JNICALL
Java_com_leher_NativeCounterModule_nativeDecrement(JNIEnv *env, jobject /*thiz*/, jlong handle) {
  return reinterpret_cast<CounterCore *>(handle)->decrement();
}

JNIEXPORT jint JNICALL
Java_com_leher_NativeCounterModule_nativeReset(JNIEnv *env, jobject /*thiz*/, jlong handle) {
  return reinterpret_cast<CounterCore *>(handle)->reset();
}

JNIEXPORT jint JNICALL
Java_com_leher_NativeCounterModule_nativeGetValue(JNIEnv *env, jobject /*thiz*/, jlong handle) {
  return reinterpret_cast<CounterCore *>(handle)->getValue();
}

JNIEXPORT jint JNICALL
Java_com_leher_NativeCounterModule_nativeGetPressCount(JNIEnv *env, jobject /*thiz*/, jlong handle) {
  return reinterpret_cast<CounterCore *>(handle)->getPressCount();
}

// ─── Event callback registration ─────────────────────────────────────────────

/**
 * Stores a global reference to the Kotlin CounterCallback instance so the C++
 * lambda can call it when the counter changes.
 *
 * Threading note: In RN new arch, increment/decrement/reset are called from
 * the JS thread, so onChanged is also invoked on the JS thread — safe for
 * direct JS event dispatch from Kotlin.
 */
JNIEXPORT void JNICALL
Java_com_leher_NativeCounterModule_nativeSetCallback(
    JNIEnv *env, jobject /*thiz*/, jlong handle, jobject callback) {

  // Create a global reference so the lambda can hold it past this call.
  jobject globalCallback = env->NewGlobalRef(callback);
  jclass cls = env->GetObjectClass(globalCallback);
  jmethodID onChangedMethod = env->GetMethodID(cls, "onChanged", "(II)V");

  if (!onChangedMethod) {
    LOGE("Could not find CounterCallback#onChanged(II)V");
    env->DeleteGlobalRef(globalCallback);
    return;
  }

  // Cache the JVM pointer so the lambda can attach threads if needed.
  JavaVM *jvm = nullptr;
  env->GetJavaVM(&jvm);

  auto *core = reinterpret_cast<CounterCore *>(handle);
  core->setOnChange([jvm, globalCallback, onChangedMethod](CounterEvent event) {
    JNIEnv *callEnv = nullptr;
    bool attached = false;

    jint status = jvm->GetEnv(reinterpret_cast<void **>(&callEnv), JNI_VERSION_1_6);
    if (status == JNI_EDETACHED) {
      jvm->AttachCurrentThread(&callEnv, nullptr);
      attached = true;
    }

    if (callEnv) {
      callEnv->CallVoidMethod(globalCallback, onChangedMethod,
                              static_cast<jint>(event.value),
                              static_cast<jint>(event.pressCount));
    }

    if (attached) {
      jvm->DetachCurrentThread();
    }
  });
}

} // extern "C"
