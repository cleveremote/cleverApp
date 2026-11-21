# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Modules natifs de l'app (HotspotModule, SSLCAModule, CustomOkHttpClientFactory,
# MdnsDns) : appelés par React Native par réflexion, à ne pas renommer ni
# retirer.
-keep class com.cleveremote.hydrophytoapp.** { *; }

# react-native-zeroconf (découverte mDNS) : la lib dnssd embarquée est appelée
# depuis le JNI (libjdns_sd) par nom de classe. R8 ne doit rien renommer ni retirer.
-keep class com.github.druk.** { *; }
-keep class com.balthazargronon.RCTZeroconf.** { *; }
-dontwarn com.github.druk.**
