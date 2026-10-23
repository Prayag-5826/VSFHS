# Capacitor core and plugins
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep class com.getcapacitor.** { *; }

# Calls from the web page into Android
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Readable crash traces
-keepattributes *Annotation*, SourceFile, LineNumberTable
-renamesourcefileattribute SourceFile
