package com.supersmashbrawl.listener

import com.supersmashbrawl.SuperSmashBrawlPlugin
import com.supersmashbrawl.listener.impl.PlayerListener
import com.supersmashbrawl.listener.impl.GameListener

class ListenerManager(private val plugin: SuperSmashBrawlPlugin) {
    
    fun registerListeners() {
        // Register all event listeners
        plugin.server.pluginManager.registerEvents(PlayerListener(plugin), plugin)
        plugin.server.pluginManager.registerEvents(GameListener(plugin), plugin)
        
        plugin.logger.info("Registered event listeners")
    }
}