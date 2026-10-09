plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Inject existing upload credentials from the release runner's secret store.
// No keystore/password is bundled in dart-define or committed to this repo.
val uploadSigningNames = listOf(
    "GAEGAETING_UPLOAD_STORE_FILE",
    "GAEGAETING_UPLOAD_STORE_PASSWORD",
    "GAEGAETING_UPLOAD_KEY_ALIAS",
    "GAEGAETING_UPLOAD_KEY_PASSWORD",
)
val uploadSigning = uploadSigningNames.associateWith { System.getenv(it).orEmpty() }
val hasUploadSigning = uploadSigning.values.all { it.isNotBlank() }
check(uploadSigning.values.all { it.isBlank() } || hasUploadSigning) {
    "Incomplete upload signing configuration; inject all four GAEGAETING_UPLOAD_* values."
}
val buildsReleaseBundle = gradle.startParameter.taskNames.any {
    it.contains("bundle", ignoreCase = true) && it.contains("release", ignoreCase = true)
}
check((System.getenv("GAEGAETING_REQUIRE_UPLOAD_SIGNING") != "true" && !buildsReleaseBundle) || hasUploadSigning) {
    "Store artifact requires upload signing; debug signing is not accepted."
}
if (hasUploadSigning) {
    check(file(uploadSigning.getValue("GAEGAETING_UPLOAD_STORE_FILE")).isFile) {
        "Upload keystore is not available on this runner."
    }
}

android {
    namespace = "app.gaegaeting"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "app.gaegaeting"
        manifestPlaceholders["appAuthRedirectScheme"] = "app.gaegaeting"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasUploadSigning) {
            create("upload") {
                storeFile = file(uploadSigning.getValue("GAEGAETING_UPLOAD_STORE_FILE"))
                storePassword = uploadSigning.getValue("GAEGAETING_UPLOAD_STORE_PASSWORD")
                keyAlias = uploadSigning.getValue("GAEGAETING_UPLOAD_KEY_ALIAS")
                keyPassword = uploadSigning.getValue("GAEGAETING_UPLOAD_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            // Local release-mode reviews remain possible without store credentials.
            // Store builds must set GAEGAETING_REQUIRE_UPLOAD_SIGNING=true.
            signingConfig = signingConfigs.getByName(if (hasUploadSigning) "upload" else "debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
