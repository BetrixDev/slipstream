package com.supersmashbrawl

import com.supersmashbrawl.arena.ArenaManager
import com.supersmashbrawl.command.CommandManager
import com.supersmashbrawl.config.ConfigManager
import com.supersmashbrawl.game.GameManager
import com.supersmashbrawl.listener.ListenerManager
import com.supersmashbrawl.queue.QueueManager
import org.bstats.bukkit.Metrics
import org.bukkit.plugin.java.JavaPlugin
import java.util.logging.Level

class SuperSmashBrawlPlugin : JavaPlugin() {
    
    companion object {
        lateinit var instance: SuperSmashBrawlPlugin
            private set
    }
    
    lateinit var configManager: ConfigManager
        private set
    lateinit var arenaManager: ArenaManager
        private set
    lateinit var gameManager: GameManager
        private set
    lateinit var queueManager: QueueManager
        private set
    lateinit var commandManager: CommandManager
        private set
    lateinit var listenerManager: ListenerManager
        private set
    
    override fun onEnable() {
        instance = this
        
        try {
            logger.info("Enabling Super Smash Brawl v${description.version}")
            
            // Initialize managers in dependency order
            initializeManagers()
            
            // Register commands and listeners
            registerCommands()
            registerListeners()
            
            // Initialize metrics
            initializeMetrics()
            
            logger.info("Super Smash Brawl has been enabled successfully!")
            
        } catch (e: Exception) {
            logger.log(Level.SEVERE, "Failed to enable Super Smash Brawl", e)
            server.pluginManager.disablePlugin(this)
        }
    }
    
    override fun onDisable() {
        try {
            logger.info("Disabling Super Smash Brawl...")
            
            // Clean up active games
            if (::gameManager.isInitialized) {
                gameManager.shutdown()
            }
            
            // Clear queues
            if (::queueManager.isInitialized) {
                queueManager.shutdown()
            }
            
            // Save configurations
            if (::configManager.isInitialized) {
                configManager.saveConfigs()
            }
            
            logger.info("Super Smash Brawl has been disabled successfully!")
            
        } catch (e: Exception) {
            logger.log(Level.SEVERE, "Error occurred while disabling Super Smash Brawl", e)
        }
    }
    
    private fun initializeManagers() {
        configManager = ConfigManager(this)
        arenaManager = ArenaManager(this)
        gameManager = GameManager(this)
        queueManager = QueueManager(this)
        commandManager = CommandManager(this)
        listenerManager = ListenerManager(this)
    }
    
    private fun registerCommands() {
        commandManager.registerCommands()
    }
    
    private fun registerListeners() {
        listenerManager.registerListeners()
    }
    
    private fun initializeMetrics() {
        try {
            val metrics = Metrics(this, 12345) // Replace with actual bStats plugin ID
            logger.info("Metrics initialized successfully")
        } catch (e: Exception) {
            logger.warning("Failed to initialize metrics: ${e.message}")
        }
    }
    
    fun reload() {
        try {
            logger.info("Reloading Super Smash Brawl...")
            
            // Reload configurations
            configManager.reloadConfigs()
            
            // Reload arenas
            arenaManager.reloadArenas()
            
            logger.info("Super Smash Brawl reloaded successfully!")
            
        } catch (e: Exception) {
            logger.log(Level.SEVERE, "Failed to reload Super Smash Brawl", e)
            throw e
        }
    }
}