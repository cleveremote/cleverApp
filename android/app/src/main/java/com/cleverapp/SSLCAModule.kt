package com.cleverApp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import okhttp3.OkHttpClient
import java.security.KeyStore
import java.security.cert.CertificateFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

class SSLCAModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SSLCAModule"

    companion object {
        var sslOkHttpClient: OkHttpClient? = null
            private set

        var sslContext: SSLContext? = null
            private set
    }

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            val context = reactApplicationContext

            // Load ca.crt from res/raw
            val certInputStream = context.resources.openRawResource(
                context.resources.getIdentifier("ca", "raw", context.packageName)
            )

            // Parse the CA certificate
            val certificateFactory = CertificateFactory.getInstance("X.509")
            val caCert = certInputStream.use {
                certificateFactory.generateCertificate(it)
            }

            // Create a KeyStore with only our CA as a trusted entry
            val keyStore = KeyStore.getInstance(KeyStore.getDefaultType()).apply {
                load(null, null)
                setCertificateEntry("custom-ca", caCert)
            }

            // Build a TrustManagerFactory from the KeyStore
            val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm()).apply {
                init(keyStore)
            }

            // Build the SSLContext
            val sslCtx = SSLContext.getInstance("TLS").apply {
                init(null, tmf.trustManagers, null)
            }

            val trustManager = tmf.trustManagers.first() as X509TrustManager

            // Build the OkHttpClient — no CertificatePinner, chain validation
            // against the custom CA is sufficient for any hostname.
            val client = OkHttpClient.Builder()
                .sslSocketFactory(sslCtx.socketFactory, trustManager)
                .build()

            sslContext = sslCtx
            sslOkHttpClient = client

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SSL_ERROR", "Failed to initialize custom CA trust: ${e.message}", e)
        }
    }
}
