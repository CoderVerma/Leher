package com.leher

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class NativeCounterPackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == NativeCounterSpec.NAME) NativeCounterModule(reactContext) else null

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        val moduleClass = NativeCounterModule::class.java
        val reactModule = moduleClass.getAnnotation(ReactModule::class.java)!!
        val info = ReactModuleInfo(
            reactModule.name,
            moduleClass.name,
            true,
            reactModule.needsEagerInit,
            reactModule.isCxxModule,
            true,
        )
        return ReactModuleInfoProvider { mapOf(reactModule.name to info) }
    }
}
