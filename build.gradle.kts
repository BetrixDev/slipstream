plugins {
    kotlin("jvm") version "2.1.0"
    id("com.github.johnrengelman.shadow") version "8.1.1"
    id("xyz.jpenilla.run-paper") version "2.3.1"
}

group = "com.supersmashbrawl"
version = "1.0.0-SNAPSHOT"
description = "Super Smash Mobs Brawl - 1v1 Minigame System"

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
    maven("https://oss.sonatype.org/content/groups/public/")
    maven("https://repo.extendedclip.com/content/repositories/placeholderapi/")
    maven("https://jitpack.io")
}

dependencies {
    compileOnly("io.papermc.paper:paper-api:1.21.6-R0.1-SNAPSHOT")
    compileOnly("me.clip:placeholderapi:2.11.6")
    
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
    implementation("org.bstats:bstats-bukkit:3.1.0")
    
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.1")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.2.1")
}

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(21))
}

kotlin {
    jvmToolchain(21)
}

tasks {
    compileKotlin {
        kotlinOptions.jvmTarget = "21"
    }
    
    processResources {
        val props = mapOf("version" to version)
        inputs.properties(props)
        filteringCharset = "UTF-8"
        filesMatching("plugin.yml") {
            expand(props)
        }
    }
    
    shadowJar {
        archiveClassifier.set("")
        relocate("org.bstats", "com.supersmashbrawl.bstats")
        relocate("kotlin", "com.supersmashbrawl.kotlin")
        relocate("kotlinx", "com.supersmashbrawl.kotlinx")
    }
    
    runServer {
        minecraftVersion("1.21.6")
    }
}