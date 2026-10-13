package com.cleverApp

import android.content.Context
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.ConnectionPool
import okhttp3.OkHttpClient
import java.security.KeyStore
import java.security.cert.CertificateFactory
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager
import java.util.concurrent.TimeUnit

class CustomOkHttpClientFactory(private val context: Context) : OkHttpClientFactory {

    override fun createNewNetworkModuleClient(): OkHttpClient {
        val builder = OkHttpClientProvider.createClientBuilder()

        // Android cannot resolve `.local` hostnames on its own — resolve them over
        // mDNS so the URL keeps the hostname the certificate is issued for.
        builder.dns(MdnsDns(context))

        // React Native hands out a builder with every timeout at 0 — meaning no
        // timeout at all. On the LAN that is the difference between a failure and
        // a hang: a candidate address that is not on the current link, or a pooled
        // socket the hotspot took down under us, only errors out once the kernel
        // has exhausted its TCP retransmits, minutes later. The screen has long
        // given up by then, yet the request still reaches the box — which is
        // exactly how a `configure` shows up late in the box logs.
        //
        // The WebSocket module overrides these on its own builder (read timeout 0,
        // as a long-lived socket needs), so bounding them here is safe.
        builder
            .connectTimeout(CONNECT_TIMEOUT_S, TimeUnit.SECONDS)
            .readTimeout(READ_TIMEOUT_S, TimeUnit.SECONDS)
            .writeTimeout(WRITE_TIMEOUT_S, TimeUnit.SECONDS)

        // Idle connections are dropped well before the default five minutes. The
        // pairing screen fetches the network list, then waits however long the user
        // needs to fill the form before posting the configuration: reusing that
        // first socket means writing into a connection the access point may have
        // silently dropped in between, and waiting out the retransmits again.
        builder.connectionPool(
            ConnectionPool(MAX_IDLE_CONNECTIONS, IDLE_KEEP_ALIVE_S, TimeUnit.SECONDS)
        )

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

        private const val CONNECT_TIMEOUT_S = 8L
        private const val READ_TIMEOUT_S = 30L
        private const val WRITE_TIMEOUT_S = 15L
        private const val MAX_IDLE_CONNECTIONS = 5
        private const val IDLE_KEEP_ALIVE_S = 30L
    }
}
