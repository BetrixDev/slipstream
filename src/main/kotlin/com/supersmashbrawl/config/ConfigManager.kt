package com.supersmashbrawl.config

import com.supersmashbrawl.SuperSmashBrawlPlugin
import org.bukkit.configuration.file.FileConfiguration
import org.bukkit.configuration.file.YamlConfiguration
import java.io.File
import java.io.IOException
import java.util.logging.Level

class ConfigManager(private val plugin: SuperSmashBrawlPlugin) {
    
    private val configFiles = mutableMapOf<String, File>()
    private val configurations = mutableMapOf<String, FileConfiguration>()
    
    companion object {
        const val MAIN_CONFIG = "config"
        const val MESSAGES_CONFIG = "messages"
        const val ARENAS_CONFIG = "arenas"
        const val GAMES_CONFIG = "games"
    }
    
    init {
        initializeConfigs()
    }
    
    private fun initializeConfigs() {
        // Create config files
        createConfig(MAIN_CONFIG)
        createConfig(MESSAGES_CONFIG)
        createConfig(ARENAS_CONFIG)
        createConfig(GAMES_CONFIG)
        
        // Load default configurations
        loadDefaultConfigs()
    }
    
    private fun createConfig(configName: String) {
        val configFile = File(plugin.dataFolder, "$configName.yml")
        configFiles[configName] = configFile
        
        if (!configFile.exists()) {
            configFile.parentFile.mkdirs()
            plugin.saveResource("$configName.yml", false)
        }
        
        configurations[configName] = YamlConfiguration.loadConfiguration(configFile)
    }
    
    private fun loadDefaultConfigs() {
        // Main config defaults
        val mainConfig = getConfig(MAIN_CONFIG)
        mainConfig.addDefault("database.enabled", false)
        mainConfig.addDefault("database.type", "sqlite")
        mainConfig.addDefault("database.host", "localhost")
        mainConfig.addDefault("database.port", 3306)
        mainConfig.addDefault("database.database", "supersmashbrawl")
        mainConfig.addDefault("database.username", "root")
        mainConfig.addDefault("database.password", "password")
        
        mainConfig.addDefault("queue.max-wait-time", 300)
        mainConfig.addDefault("queue.min-players", 2)
        mainConfig.addDefault("queue.max-players", 2)
        
        mainConfig.addDefault("game.countdown-seconds", 10)
        mainConfig.addDefault("game.max-duration-minutes", 10)
        mainConfig.addDefault("game.respawn-enabled", true)
        mainConfig.addDefault("game.spectator-mode", true)
        
        // Messages config defaults
        val messagesConfig = getConfig(MESSAGES_CONFIG)
        messagesConfig.addDefault("prefix", "&6[&eSuperSmashBrawl&6] &r")
        messagesConfig.addDefault("queue.joined", "&aYou have joined the 1v1 queue!")
        messagesConfig.addDefault("queue.left", "&cYou have left the 1v1 queue!")
        messagesConfig.addDefault("queue.already-in-queue", "&cYou are already in a queue!")
        messagesConfig.addDefault("queue.not-in-queue", "&cYou are not in any queue!")
        messagesConfig.addDefault("queue.match-found", "&aMatch found! Teleporting to arena...")
        messagesConfig.addDefault("queue.position", "&eYou are position &6{position} &eof &6{total} &ein the queue")
        
        messagesConfig.addDefault("game.starting", "&eGame starting in &6{countdown} &eseconds!")
        messagesConfig.addDefault("game.started", "&aGame has started! Fight!")
        messagesConfig.addDefault("game.ended", "&eGame ended!")
        messagesConfig.addDefault("game.winner", "&6{winner} &awins the match!")
        messagesConfig.addDefault("game.draw", "&eThe match ended in a draw!")
        
        messagesConfig.addDefault("error.no-permission", "&cYou don't have permission to do that!")
        messagesConfig.addDefault("error.player-only", "&cThis command can only be used by players!")
        messagesConfig.addDefault("error.no-arena-available", "&cNo arena is currently available!")
        messagesConfig.addDefault("error.already-in-game", "&cYou are already in a game!")
        
        // Save defaults
        saveConfigs()
    }
    
    fun getConfig(configName: String): FileConfiguration {
        return configurations[configName] 
            ?: throw IllegalArgumentException("Config '$configName' not found")
    }
    
    fun reloadConfig(configName: String) {
        val configFile = configFiles[configName] 
            ?: throw IllegalArgumentException("Config file '$configName' not found")
        
        configurations[configName] = YamlConfiguration.loadConfiguration(configFile)
    }
    
    fun reloadConfigs() {
        configFiles.keys.forEach { configName ->
            reloadConfig(configName)
        }
    }
    
    fun saveConfig(configName: String) {
        val config = getConfig(configName)
        val configFile = configFiles[configName] 
            ?: throw IllegalArgumentException("Config file '$configName' not found")
        
        try {
            config.save(configFile)
        } catch (e: IOException) {
            plugin.logger.log(Level.SEVERE, "Could not save config '$configName'", e)
        }
    }
    
    fun saveConfigs() {
        configFiles.keys.forEach { configName ->
            saveConfig(configName)
        }
    }
    
    fun getString(configName: String, path: String): String? {
        return getConfig(configName).getString(path)
    }
    
    fun getInt(configName: String, path: String): Int {
        return getConfig(configName).getInt(path)
    }
    
    fun getBoolean(configName: String, path: String): Boolean {
        return getConfig(configName).getBoolean(path)
    }
    
    fun getDouble(configName: String, path: String): Double {
        return getConfig(configName).getDouble(path)
    }
    
    fun getStringList(configName: String, path: String): List<String> {
        return getConfig(configName).getStringList(path)
    }
}