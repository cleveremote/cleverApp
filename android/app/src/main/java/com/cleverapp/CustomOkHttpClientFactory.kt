package com.cleverApp

import android.content.Context
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.OkHttpClient
import java.security.KeyStore
import java.security.cert.CertificateFactory
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

class CustomOkHttpClientFactory(private val context: Context) : OkHttpClientFactory {

    override fun createNewNetworkModuleClient(): OkHttpClient {
        val builder = OkHttpClientProvider.createClientBuilder()

        try {
            val certInputStream = context.resources.openRawResource(
                context.resources.getIdentifier("ca", "raw", context.packageName)
            )
            val caCert = CertificateFactory.getInstance("X.509").let { factory ->
                certInputStream.use { factory.generateCertificate(it) }
            }

            val keyStore = KeyStore.getInstance(KeyStore.getDefaultType()).apply {
                load(null, null)
                setCertificateEntry("custom-ca", caCert)
            }
            val defaultTmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm()).apply {
                init(null as KeyStore?)
            }
            val defaultTm = defaultTmf.trustManagers.first() as X509TrustManager
            for ((i, cert) in defaultTm.acceptedIssuers.withIndex()) {
                keyStore.setCertificateEntry("system-ca-$i", cert)
            }

            val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm()).apply {
                init(keyStore)
            }
            val sslCtx = SSLContext.getInstance("TLS").apply {
                init(null, tmf.trustManagers, null)
            }
            val trustManager = tmf.trustManagers.first() as X509TrustManager

            builder.sslSocketFactory(sslCtx.socketFactory, trustManager)

            // Skip hostname verification for IP addresses (LAN device discovery).
            // The CA trust chain is the security boundary — not the hostname.
            val defaultVerifier = HttpsURLConnection.getDefaultHostnameVerifier()
            builder.hostnameVerifier { hostname, session ->
                IP_PATTERN.matches(hostname) || defaultVerifier.verify(hostname, session)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return builder.build()
    }

    companion object {
        private val IP_PATTERN = Regex("^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$")
    }
}
