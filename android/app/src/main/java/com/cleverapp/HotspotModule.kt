package com.cleverApp

import android.content.Context
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.network.OkHttpClientProvider

/**
 * Joins the CleverBox provisioning hotspot from a scanned QR code.
 *
 * Uses [WifiNetworkSpecifier] (API 29+), which asks the user to confirm in a
 * system dialog and grants the *app* — not the device — access to that network.
 * The crucial part is [ConnectivityManager.bindProcessToNetwork] in
 * [NetworkCallback.onAvailable]: without it the socket and OkHttp keep going out
 * over mobile data and the box stays unreachable even though the hotspot is
 * joined.
 *
 * The bind also makes MdnsDns's MulticastSocket use the hotspot interface, which
 * is what lets `<box>.local` resolve there.
 */
class HotspotModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    private val connectivityManager: ConnectivityManager
        get() = reactApplicationContext
            .getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    /** Held so the request can be torn down in [disconnect]. */
    private var activeCallback: ConnectivityManager.NetworkCallback? = null
    private var pendingPromise: Promise? = null

    // ---------------------------------------------------------------- exported

    @ReactMethod
    fun isSupported(promise: Promise) {
        promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
    }

    @ReactMethod
    fun connect(config: ReadableMap, promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            promise.reject(
                E_UNSUPPORTED,
                "Rejoindre un réseau Wi-Fi depuis l'application demande Android 10 ou plus récent."
            )
            return
        }

        val ssid = config.getString("ssid")
        if (ssid.isNullOrEmpty()) {
            promise.reject(E_UNSUPPORTED, "SSID manquant.")
            return
        }

        // Below API 33, requestNetwork silently never fires when location
        // services are off — permission granted is not enough. Fail with
        // something actionable instead of waiting out the timeout.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU && !isLocationEnabled()) {
            promise.reject(
                E_LOCATION_DISABLED,
                "Activez la localisation pour que le téléphone puisse rejoindre le réseau de la box."
            )
            return
        }

        if (pendingPromise != null) {
            promise.reject(E_BUSY, "Une connexion au hotspot est déjà en cours.")
            return
        }

        val password = config.getString("password").orEmpty()
        val security = config.getString("security")?.uppercase() ?: "WPA2"
        val timeoutMs = if (config.hasKey("timeoutMs")) config.getInt("timeoutMs")
        else DEFAULT_TIMEOUT_MS

        try {
            requestNetwork(ssid, password, security, timeoutMs, promise)
        } catch (e: Exception) {
            pendingPromise = null
            promise.reject(E_UNKNOWN, "Échec de la demande de connexion : ${e.message}", e)
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        releaseNetwork()
        promise.resolve(null)
    }

    @ReactMethod
    fun getCurrentSsid(promise: Promise) {
        try {
            val wifiManager = reactApplicationContext
                .applicationContext
                .getSystemService(Context.WIFI_SERVICE) as WifiManager
            @Suppress("DEPRECATION")
            val raw = wifiManager.connectionInfo?.ssid
            // The framework returns the SSID quoted, and this placeholder when
            // it will not tell us (missing permission, or not connected).
            val ssid = raw?.trim('"')
            if (ssid.isNullOrEmpty() || ssid == UNKNOWN_SSID) {
                promise.resolve(null)
            } else {
                promise.resolve(ssid)
            }
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    /** Required by the New Architecture event emitter; no-ops on purpose. */
    @ReactMethod
    fun addListener(eventName: String) = Unit

    @ReactMethod
    fun removeListeners(count: Int) = Unit

    // ---------------------------------------------------------------- internal

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun requestNetwork(
        ssid: String,
        password: String,
        security: String,
        timeoutMs: Int,
        promise: Promise
    ) {
        val specifier = WifiNetworkSpecifier.Builder()
            .setSsid(ssid)
            .apply {
                when (security) {
                    "OPEN" -> Unit
                    "WPA3" -> setWpa3Passphrase(password)
                    // WEP has no specifier API; WPA2 is the closest the platform
                    // offers and covers every box we ship.
                    else -> setWpa2Passphrase(password)
                }
            }
            .build()

        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            // The provisioning AP has no internet access. Without this the
            // system decides the network is unusable and drops it.
            .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .setNetworkSpecifier(specifier)
            .build()

        // Any previous request must go before a new one, or the old callback
        // keeps the old network bound.
        releaseNetwork()
        pendingPromise = promise

        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                // Pin this process's traffic to the hotspot — see the class doc.
                val bound = connectivityManager.bindProcessToNetwork(network)
                evictPooledConnections()
                resolvePending(
                    Arguments.createMap().apply {
                        putString("ssid", ssid)
                        putString("binding", if (bound) "bound" else "system")
                    }
                )
            }

            override fun onUnavailable() {
                // Also what fires when the user dismisses the system dialog, so
                // the message has to cover both.
                rejectPending(
                    E_TIMEOUT,
                    "Impossible de rejoindre \"$ssid\" : réseau introuvable ou demande refusée."
                )
                releaseNetwork()
            }

            override fun onLost(network: Network) {
                // Late loss: the promise is long settled, so tell JS out-of-band.
                emit(EVENT_LOST, ssid)
                // Unbinding is not enough: leaving the request registered keeps
                // the framework hunting for the box's SSID, which delays the
                // fallback to the saved Wi-Fi and silently re-joins the
                // provisioning AP if it comes back up.
                releaseNetwork()
            }
        }

        activeCallback = callback
        connectivityManager.requestNetwork(request, callback, timeoutMs)
    }

    private fun releaseNetwork() {
        activeCallback?.let {
            try {
                connectivityManager.unregisterNetworkCallback(it)
            } catch (_: IllegalArgumentException) {
                // Already unregistered — nothing to do.
            }
        }
        activeCallback = null
        connectivityManager.bindProcessToNetwork(null)
        evictPooledConnections()
    }

    /**
     * Drops OkHttp's idle connections whenever the process changes link.
     *
     * They were opened on the previous network and lead nowhere now, but nothing
     * tells the pool that: the next request is written into a socket that no
     * longer goes anywhere, and only errors out once the kernel has run out of
     * TCP retransmits — a minute or more during which the box has heard nothing.
     */
    private fun evictPooledConnections() {
        try {
            OkHttpClientProvider.getOkHttpClient().connectionPool.evictAll()
        } catch (e: Exception) {
            // The networking module may not be up yet; nothing is pooled then.
        }
    }

    private fun resolvePending(value: Any?) {
        pendingPromise?.resolve(value)
        pendingPromise = null
    }

    private fun rejectPending(code: String, message: String) {
        pendingPromise?.reject(code, message)
        pendingPromise = null
    }

    private fun isLocationEnabled(): Boolean = try {
        val manager = reactApplicationContext
            .getSystemService(Context.LOCATION_SERVICE) as LocationManager
        manager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
            manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    } catch (e: Exception) {
        // If we cannot tell, let the connection attempt be the judge.
        true
    }

    private fun emit(event: String, ssid: String) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(event, Arguments.createMap().apply { putString("ssid", ssid) })
        } catch (_: Exception) {
            // The bridge can already be gone during teardown.
        }
    }

    override fun invalidate() {
        releaseNetwork()
        super.invalidate()
    }

    companion object {
        const val NAME = "HotspotModule"

        private const val DEFAULT_TIMEOUT_MS = 30000
        private const val UNKNOWN_SSID = "<unknown ssid>"
        private const val EVENT_LOST = "hotspot/lost"

        private const val E_TIMEOUT = "E_HOTSPOT_TIMEOUT"
        private const val E_UNSUPPORTED = "E_HOTSPOT_UNSUPPORTED"
        private const val E_LOCATION_DISABLED = "E_HOTSPOT_LOCATION_DISABLED"
        private const val E_BUSY = "E_HOTSPOT_BUSY"
        private const val E_UNKNOWN = "E_HOTSPOT_UNKNOWN"
    }
}
