package com.cleveremote.hydrophytoapp

import android.content.Context
import android.util.Log
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.Call
import okhttp3.ConnectionPool
import okhttp3.EventListener
import okhttp3.Interceptor
import okhttp3.MediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.RequestBody
import okio.BufferedSink
import java.io.IOException
import java.net.InetSocketAddress
import java.net.Proxy
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

        // HTTP/1.1 only. The box's Caddy offers h2, and over h2 every call to the
        // box is multiplexed onto one shared connection: the `Connection: close`
        // boxHttp.ts sends is a connection-specific header h2 drops. Once that
        // connection stalls on the hotspot, every later call — retries included —
        // is queued onto it and times out while the box is right there. Over
        // HTTP/1.1 the header does what it says: one connection per call.
        builder.protocols(listOf(Protocol.HTTP_1_1))

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

        // A request OkHttp has started sending is never sent again. By default a
        // connection that drops before the response makes OkHttp replay the call
        // on a fresh one — invisible from JS. `configure` is exactly that case: the
        // box leaves its access point as soon as it has the request, the socket
        // dies unanswered, and the box got the configuration twice, ~400 ms apart.
        // Marking the body one-shot keeps the retries that matter here — a failed
        // connect still moves on to the next mDNS address — and drops only the
        // replay of a call the box may already have acted on.
        builder.addInterceptor(NoReplayOfSentRequests)

        builder.eventListener(FailureLogger)

        return builder.build()
    }

    private object NoReplayOfSentRequests : Interceptor {
        private val IDEMPOTENT = setOf("GET", "HEAD", "OPTIONS", "TRACE")

        override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
            val request = chain.request()
            val body = request.body
            if (body == null || body.isOneShot() || request.method in IDEMPOTENT) {
                return chain.proceed(request)
            }
            return chain.proceed(request.newBuilder().method(request.method, OneShot(body)).build())
        }

        private class OneShot(private val delegate: RequestBody) : RequestBody() {
            override fun contentType(): MediaType? = delegate.contentType()
            override fun contentLength(): Long = delegate.contentLength()
            override fun writeTo(sink: BufferedSink) = delegate.writeTo(sink)
            override fun isOneShot(): Boolean = true
        }
    }

    /**
     * Logs the native cause of a failed call.
     *
     * React Native reduces every transport failure to "Network request failed",
     * which cannot tell a refused port from a rejected certificate — and on the
     * box's access point those call for very different fixes.
     */
    private object FailureLogger : EventListener() {
        override fun connectFailed(
            call: Call,
            inetSocketAddress: InetSocketAddress,
            proxy: Proxy,
            protocol: Protocol?,
            ioe: IOException
        ) {
            Log.w(TAG, "connect ${call.request().url} via $inetSocketAddress failed: ${describe(ioe)}")
        }

        override fun callFailed(call: Call, ioe: IOException) {
            Log.w(TAG, "${call.request().method} ${call.request().url} failed: ${describe(ioe)}", ioe)
        }

        private fun describe(e: Throwable): String =
            generateSequence(e) { it.cause }
                .take(4)
                .joinToString(" <- ") { "${it.javaClass.simpleName}: ${it.message}" }
    }

    companion object {
        private const val TAG = "BoxHttp"
        private val IP_PATTERN = Regex("^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$")

        private const val CONNECT_TIMEOUT_S = 8L
        private const val READ_TIMEOUT_S = 30L
        private const val WRITE_TIMEOUT_S = 15L
        private const val MAX_IDLE_CONNECTIONS = 5
        private const val IDLE_KEEP_ALIVE_S = 30L
    }
}
