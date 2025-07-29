package com.supersmashbrawl.listener.impl

import com.supersmashbrawl.SuperSmashBrawlPlugin
import org.bukkit.event.EventHandler
import org.bukkit.event.EventPriority
import org.bukkit.event.Listener
import org.bukkit.event.entity.PlayerDeathEvent
import org.bukkit.event.player.PlayerQuitEvent
import org.bukkit.event.player.PlayerRespawnEvent

class PlayerListener(private val plugin: SuperSmashBrawlPlugin) : Listener {
    
    @EventHandler(priority = EventPriority.HIGH)
    fun onPlayerQuit(event: PlayerQuitEvent) {
        val player = event.player
        
        // Remove player from queues
        plugin.queueManager.handlePlayerQuit(player)
        
        // Handle player quit in active games
        plugin.gameManager.handlePlayerQuit(player)
    }
    
    @EventHandler(priority = EventPriority.HIGH)
    fun onPlayerDeath(event: PlayerDeathEvent) {
        val player = event.entity
        val killer = player.killer
        
        // Check if player is in a game
        if (plugin.gameManager.isPlayerInGame(player)) {
            // Cancel normal death behavior for game players
            event.isCancelled = false
            event.deathMessage = null // Suppress death message
            event.drops.clear() // Don't drop items
            event.droppedExp = 0 // Don't drop experience
            
            // Handle death in game
            plugin.gameManager.handlePlayerDeath(player, killer)
        }
    }
    
    @EventHandler(priority = EventPriority.HIGH)
    fun onPlayerRespawn(event: PlayerRespawnEvent) {
        val player = event.player
        
        // If player is in a game, handle respawn specially
        val game = plugin.gameManager.getPlayerGame(player)
        if (game != null) {
            // Set respawn location to arena or remove from game
            // This depends on the game type - for 1v1, player should be eliminated
            plugin.server.scheduler.runTaskLater(plugin, Runnable {
                // Handle respawn after the event completes
                if (plugin.gameManager.isPlayerInGame(player)) {
                    // For games where respawning isn't allowed, remove player
                    plugin.gameManager.removePlayerFromGame(player, "Died")
                }
            }, 1L)
        }
    }
}