package com.cleverApp

import android.content.Context
import android.net.ConnectivityManager
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log
import okhttp3.Dns
import java.net.DatagramPacket
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.MulticastSocket
import java.net.NetworkInterface
import java.net.UnknownHostException

/**
 * Resolves `.local` hostnames over multicast DNS.
 *
 * Android has no system mDNS resolver: `InetAddress.getByName("pi-dev-1.local")`
 * throws UnknownHostException, unlike iOS which resolves `.local` natively via
 * Bonjour. `NsdManager` only browses advertised *services*, and the box publishes
 * a bare hostname — so this queries the A record directly.
 *
 * Plugging this in as OkHttp's [Dns] keeps the connection URL on the hostname,
 * so the server certificate's `DNS:pi-dev-1.local` SAN still matches and
 * hostname verification stays enabled.
 */
class MdnsDns(
    private val context: Context,
    private val fallback: Dns = Dns.SYSTEM
) : Dns {

    private data class Entry(val addresses: List<InetAddress>, val expiresAt: Long)

    private val cache = mutableMapOf<String, Entry>()

    /** Link the cached entries were learned on — see [lookup]. */
    private var cacheNetworkId: String? = null

    override fun lookup(hostname: String): List<InetAddress> {
        if (!hostname.endsWith(LOCAL_SUFFIX, ignoreCase = true)) {
            return fallback.lookup(hostname)
        }

        synchronized(cache) {
            // An answer is only valid on the link it was heard on. Joining the
            // box's access point — or leaving it — makes every address learned
            // on the previous network unreachable, and handing one of those back
            // costs a full connect timeout for nothing. This is not theoretical:
            // the pairing screen's network test resolves the box over the home
            // Wi-Fi moments before the phone switches to the hotspot.
            val networkId = currentNetworkId()
            if (networkId != cacheNetworkId) {
                cache.clear()
                cacheNetworkId = networkId
            }

            cache[hostname]?.let { entry ->
                if (System.currentTimeMillis() < entry.expiresAt) {
                    return entry.addresses
                }
                cache.remove(hostname)
            }
        }

        // Every advertised address is handed back, not just the first: the box
        // answers on its LAN address *and* on the one it holds as the setup
        // access point, and which of the two is reachable depends on the
        // network the phone is currently on. OkHttp tries them in turn.
        val resolved = preferOnLink(query(hostname))
        if (resolved.isNotEmpty()) {
            synchronized(cache) {
                cache[hostname] = Entry(resolved, System.currentTimeMillis() + CACHE_TTL_MS)
            }
            return resolved
        }

        // Not cached: the gateway is a property of the network currently joined,
        // and reusing a stale one after a network switch would send the request
        // to the wrong host.
        return listOf(
            gatewayAddress()
                ?: throw UnknownHostException("mDNS resolution failed for $hostname")
        )
    }

    /**
     * The address the box holds on the link, used when the name cannot be
     * resolved.
     *
     * During QR pairing the phone joins the box's own access point, where the
     * box runs the DHCP and DNS server — and where it does not answer mDNS.
     * Mapping the name onto that address leaves the URL untouched, so SNI, the
     * Host header and hostname verification still say `<box>.local`: the
     * certificate is checked in full. A host that is not the box simply fails
     * the handshake against our CA, which is the outcome we want.
     *
     * Three sources, because they do not all exist on both paths. A network
     * joined from the Wi-Fi settings is the system default and has a default
     * route. One joined by the app through WifiNetworkSpecifier is scoped to
     * this process and declares no internet capability, so it may carry no
     * default route at all — there the DHCP server, then the DNS server, name
     * the same machine.
     */
    private fun gatewayAddress(): InetAddress? = try {
        val manager = context.applicationContext
            .getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        // The bound network first: on the specifier path it is the hotspot,
        // while the system default may still be pointing elsewhere.
        val network = manager?.boundNetworkForProcess ?: manager?.activeNetwork
        val props = manager?.getLinkProperties(network)

        val fromRoute = props?.routes
            ?.firstOrNull { it.isDefaultRoute && it.gateway is Inet4Address }
            ?.gateway
        val fromDhcp = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            props?.dhcpServerAddress
        } else {
            null
        }
        val fromDns = props?.dnsServers?.firstOrNull { it is Inet4Address }

        val resolved = fromRoute ?: fromDhcp ?: fromDns
        Log.i(
            TAG,
            "mDNS silent, falling back to $resolved " +
                "(route=$fromRoute dhcp=$fromDhcp dns=$fromDns)"
        )
        resolved
    } catch (e: Exception) {
        Log.w(TAG, "no fallback address available", e)
        null
    }

    /**
     * Identifies the link the phone is currently talking over, so cached answers
     * can be dropped when it changes. `null` — no network at all — is a value
     * like any other here: what matters is that it differs from the previous one.
     */
    private fun currentNetworkId(): String = try {
        val manager = context.applicationContext
            .getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val network = manager?.boundNetworkForProcess ?: manager?.activeNetwork
        network?.networkHandle?.toString() ?: "none"
    } catch (e: Exception) {
        "none"
    }

    /**
     * Puts the addresses that share a subnet with one of the phone's own
     * interfaces first, without dropping the others.
     *
     * A box that is on the home LAN *and* serving its provisioning access point
     * answers with one address per interface, in whatever order it pleases.
     * OkHttp tries them in turn, and a candidate that is not on the current link
     * cannot fail fast — it can only run out the connect timeout. Ordering costs
     * nothing and spends that budget where it can succeed. The unreachable ones
     * stay in the list: this is a preference, not a routing decision, and a
     * subnet match is not the only way to reach a host.
     */
    private fun preferOnLink(addresses: List<InetAddress>): List<InetAddress> {
        if (addresses.size < 2) return addresses
        val prefixes = localPrefixes()
        if (prefixes.isEmpty()) return addresses
        return addresses.sortedBy { address ->
            if (prefixes.any { it.contains(address) }) 0 else 1
        }
    }

    /** IPv4 subnets the phone currently has an address on. */
    private fun localPrefixes(): List<Prefix> {
        val prefixes = mutableListOf<Prefix>()
        try {
            for (iface in NetworkInterface.getNetworkInterfaces()) {
                if (!iface.isUp || iface.isLoopback) continue
                for (entry in iface.interfaceAddresses) {
                    val address = entry.address
                    if (address is Inet4Address) {
                        prefixes += Prefix(address.address, entry.networkPrefixLength.toInt())
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "could not enumerate local subnets", e)
        }
        return prefixes
    }

    /** A subnet, as an address and the number of leading bits that define it. */
    private class Prefix(private val reference: ByteArray, private val bits: Int) {
        fun contains(address: InetAddress): Boolean {
            val candidate = address.address
            if (candidate.size != reference.size) return false
            var remaining = bits
            for (i in candidate.indices) {
                if (remaining <= 0) return true
                val width = minOf(8, remaining)
                val mask = (0xFF shl (8 - width)) and 0xFF
                if ((candidate[i].toInt() and mask) != (reference[i].toInt() and mask)) {
                    return false
                }
                remaining -= width
            }
            return true
        }
    }

    /**
     * Sends an A query to 224.0.0.251:5353 and waits for the first answer
     * naming [hostname]. Multicast reception is filtered by default on Android,
     * hence the multicast lock.
     */
    private fun query(hostname: String): List<InetAddress> {
        val wifi = context.applicationContext
            .getSystemService(Context.WIFI_SERVICE) as? WifiManager
        val lock = wifi?.createMulticastLock("MdnsDns")?.apply {
            setReferenceCounted(true)
            acquire()
        }

        try {
            openSocket().use { socket ->
                socket.soTimeout = TIMEOUT_MS
                val group = InetAddress.getByName(MDNS_ADDRESS)
                val request = buildQuery(hostname)
                socket.send(DatagramPacket(request, request.size, group, MDNS_PORT))

                val deadline = System.currentTimeMillis() + TIMEOUT_MS
                val buffer = ByteArray(1500)
                while (System.currentTimeMillis() < deadline) {
                    val packet = DatagramPacket(buffer, buffer.size)
                    try {
                        socket.receive(packet)
                    } catch (_: Exception) {
                        return emptyList() // timed out
                    }
                    val found = parseAnswers(packet.data, packet.length, hostname)
                    if (found.isNotEmpty()) return found
                }
            }
        } catch (_: Exception) {
            return emptyList()
        } finally {
            if (lock?.isHeld == true) lock.release()
        }
        return emptyList()
    }

    /**
     * Opens the socket the answer can actually arrive on.
     *
     * Responders are free to answer a query over multicast rather than unicast
     * to the sender's port, and the box does exactly that — an ephemeral socket
     * that has not joined the group never sees the reply, whatever the QU bit
     * says. So bind 5353 and join 224.0.0.251. `MulticastSocket(port)` sets
     * SO_REUSEADDR before binding, which is what lets this coexist with the
     * system responder already holding the port (setting it afterwards would be
     * too late to matter).
     *
     * The group is joined on every multicast-capable interface rather than
     * guessing which one carries the Wi-Fi; extra joins are harmless. If the
     * port cannot be bound at all, fall back to an ephemeral socket — still
     * correct against a responder that honours the unicast-response bit.
     */
    private fun openSocket(): MulticastSocket {
        val socket = try {
            MulticastSocket(MDNS_PORT)
        } catch (_: Exception) {
            return MulticastSocket()
        }

        val group = InetSocketAddress(InetAddress.getByName(MDNS_ADDRESS), MDNS_PORT)
        var joined = false
        try {
            for (iface in NetworkInterface.getNetworkInterfaces()) {
                if (!iface.isUp || iface.isLoopback || !iface.supportsMulticast()) continue
                try {
                    socket.joinGroup(group, iface)
                    joined = true
                } catch (_: Exception) {
                    // This interface cannot join — the others may still.
                }
            }
        } catch (_: Exception) {
            // Enumeration itself failed; fall through to the check below.
        }

        if (!joined) {
            socket.close()
            return MulticastSocket()
        }
        return socket
    }

    /** Standard DNS query, QTYPE=A, QCLASS=IN with the mDNS unicast-response bit. */
    private fun buildQuery(hostname: String): ByteArray {
        val out = ArrayList<Byte>(64)
        // Header: ID 0, no flags, one question, no answer/authority/additional.
        repeat(4) { out.add(0.toByte()) }
        out.add(0.toByte()); out.add(1.toByte())
        repeat(6) { out.add(0.toByte()) }
        // QNAME: length-prefixed labels, null terminated.
        for (label in hostname.split('.')) {
            if (label.isEmpty()) continue
            val bytes = label.toByteArray(Charsets.UTF_8)
            out.add(bytes.size.toByte())
            bytes.forEach { out.add(it) }
        }
        out.add(0.toByte())
        out.add(0.toByte()); out.add(TYPE_A.toByte())      // QTYPE = A
        out.add(0x80.toByte()); out.add(CLASS_IN.toByte()) // QU bit + QCLASS = IN
        return out.toByteArray()
    }

    /**
     * Walks the answer section, returning every A record matching [hostname].
     *
     * A single response can carry several — a box that is both on the LAN and
     * serving its own access point announces one address per interface — and
     * only the caller's current network decides which of them is usable.
     */
    private fun parseAnswers(data: ByteArray, length: Int, hostname: String): List<InetAddress> {
        val found = mutableListOf<InetAddress>()
        if (length < HEADER_SIZE) return found
        val questionCount = readShort(data, 4)
        val answerCount = readShort(data, 6)
        if (answerCount == 0) return found

        var offset = HEADER_SIZE
        repeat(questionCount) {
            offset = skipName(data, offset, length)
            offset += 4 // QTYPE + QCLASS
        }

        repeat(answerCount) {
            if (offset >= length) return found
            val name = readName(data, offset, length) ?: return found
            offset = skipName(data, offset, length)
            if (offset + 10 > length) return found
            val type = readShort(data, offset)
            val dataLength = readShort(data, offset + 8)
            offset += 10
            if (offset + dataLength > length) return found
            if (type == TYPE_A && dataLength == 4 && name.equals(hostname, ignoreCase = true)) {
                found += InetAddress.getByAddress(data.copyOfRange(offset, offset + 4))
            }
            offset += dataLength
        }
        return found
    }

    /** Reads a name, following compression pointers (RFC 1035 §4.1.4). */
    private fun readName(data: ByteArray, start: Int, length: Int): String? {
        val labels = StringBuilder()
        var offset = start
        var hops = 0
        while (offset < length) {
            val len = data[offset].toInt() and 0xFF
            when {
                len == 0 -> return labels.toString().trimEnd('.')
                len and 0xC0 == 0xC0 -> {
                    if (offset + 1 >= length || ++hops > MAX_POINTER_HOPS) return null
                    offset = ((len and 0x3F) shl 8) or (data[offset + 1].toInt() and 0xFF)
                }
                else -> {
                    if (offset + 1 + len > length) return null
                    labels.append(String(data, offset + 1, len, Charsets.UTF_8)).append('.')
                    offset += 1 + len
                }
            }
        }
        return null
    }

    /** Returns the offset just past the name at [start], without following pointers. */
    private fun skipName(data: ByteArray, start: Int, length: Int): Int {
        var offset = start
        while (offset < length) {
            val len = data[offset].toInt() and 0xFF
            when {
                len == 0 -> return offset + 1
                len and 0xC0 == 0xC0 -> return offset + 2
                else -> offset += 1 + len
            }
        }
        return length
    }

    private fun readShort(data: ByteArray, offset: Int): Int =
        ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)

    companion object {
        private const val TAG = "MdnsDns"
        private const val LOCAL_SUFFIX = ".local"
        private const val MDNS_ADDRESS = "224.0.0.251"
        private const val MDNS_PORT = 5353
        private const val TIMEOUT_MS = 2000
        private const val CACHE_TTL_MS = 30_000L
        private const val HEADER_SIZE = 12
        private const val TYPE_A = 1
        private const val CLASS_IN = 1
        private const val MAX_POINTER_HOPS = 16
    }
}
