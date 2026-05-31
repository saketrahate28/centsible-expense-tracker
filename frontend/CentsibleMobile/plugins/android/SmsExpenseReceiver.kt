package com.centsible.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Telephony
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Receives bank SMS and forwards to JS via DeviceEventEmitter event "onSmsReceived".
 */
class SmsExpenseReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION != intent.action) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        val body = messages.joinToString("") { it.messageBody ?: "" }
        val address = messages.firstOrNull()?.originatingAddress ?: ""
        val date = messages.firstOrNull()?.timestampMillis ?: System.currentTimeMillis()

        val app = context.applicationContext as? ReactApplication ?: return
        val reactContext = app.reactNativeHost.reactInstanceManager.currentReactContext ?: return

        val params = Arguments.createMap().apply {
            putString("body", body)
            putString("address", address)
            putDouble("date", date.toDouble())
        }

        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onSmsReceived", params)
    }
}
