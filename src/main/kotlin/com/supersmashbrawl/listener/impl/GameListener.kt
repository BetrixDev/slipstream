package com.supersmashbrawl.listener.impl

import com.supersmashbrawl.SuperSmashBrawlPlugin
import com.supersmashbrawl.game.GameState
import org.bukkit.event.EventHandler
import org.bukkit.event.EventPriority
import org.bukkit.event.Listener
import org.bukkit.event.entity.EntityDamageByEntityEvent
import org.bukkit.event.entity.EntityDamageEvent
import org.bukkit.event.player.PlayerMoveEvent
import org.bukkit.event.player.PlayerTeleportEvent
import org.bukkit.event.block.BlockBreakEvent
import org.bukkit.event.block.BlockPlaceEvent
import org.bukkit.event.player.PlayerDropItemEvent

import org.bukkit.event.inventory.InventoryClickEvent
import org.bukkit.entity.Player

class GameListener(private val plugin: SuperSmashBrawlPlugin) : Listener {
    
    @EventHandler(priority = EventPriority.HIGH)
    fun onEntityDamage(event: EntityDamageEvent) {
        if (event.entity !is Player) return
        
        val player = event.entity as Player
        val game = plugin.gameManager.getPlayerGame(player) ?: return
        
        // Cancel damage during countdown
        if (game.state == GameState.STARTING || game.state == GameState.WAITING) {
            event.isCancelled = true
            return
        }
        
        // Cancel damage for spectators
        if (game.hasSpectator(player)) {
            event.isCancelled = true
            return
        }
    }
    
    @EventHandler(priority = EventPriority.HIGH)
    fun onEntityDamageByEntity(event: EntityDamageByEntityEvent) {
        val victim = event.entity
        val damager = event.damager
        
        if (victim !is Player) return
        
        val game = plugin.gameManager.getPlayerGame(victim) ?: return
        
        // Check if damage is from another player in the same game
        if (damager is Player) {
            val damagerGame = plugin.gameManager.getPlayerGame(damager)
            
            // Cancel damage if players are not in the same game
            if (damagerGame == null || damagerGame.gameId != game.gameId) {
                event.isCancelled = true
                return
            }
            
            // Cancel damage during countdown
            if (game.state == GameState.STARTING || game.state == GameState.WAITING) {
                event.isCancelled = true
                return
            }
            
            // Cancel damage for/from spectators
            if (game.hasSpectator(victim) || game.hasSpectator(damager)) {
                event.isCancelled = true
                return
            }
        }
    }
    
    @EventHandler(priority = EventPriority.NORMAL)
    fun onPlayerMove(event: PlayerMoveEvent) {
        val player = event.player
        val game = plugin.gameManager.getPlayerGame(player) ?: return
        
        // Check if player moved outside arena boundaries
        val to = event.to ?: return
        
        if (!game.arena.isLocationInArena(to)) {
            // For spectators, just teleport them back
            if (game.hasSpectator(player)) {
                event.isCancelled = true
                return
            }
            
            // For players in active game, this might be handled by the game itself
            // The game's onTick method should handle out-of-bounds players
        }
        
        // Prevent movement during countdown (except Y movement for falling)
        if (game.state == GameState.STARTING) {
            val from = event.from
            if (to.x != from.x || to.z != from.z) {
                event.isCancelled = true
            }
        }
    }
    
    @EventHandler(priority = EventPriority.HIGH)
    fun onPlayerTeleport(event: PlayerTeleportEvent) {
        val player = event.player
        val game = plugin.gameManager.getPlayerGame(player) ?: return
        
        // Cancel teleportation attempts during active games (except game-controlled teleports)
        if (game.state == GameState.ACTIVE || game.state == GameState.STARTING) {
            // Allow ender pearl teleportation and game-controlled teleports
            val cause = event.cause
            if (cause != PlayerTeleportEvent.TeleportCause.ENDER_PEARL &&
                cause != PlayerTeleportEvent.TeleportCause.PLUGIN) {
                event.isCancelled = true
            }
        }
    }
    
    @EventHandler(priority = EventPriority.HIGH)
    fun onBlockBreak(event: BlockBreakEvent) {
        val player = event.player
        val game = plugin.gameManager.getPlayerGame(player) ?: return
        
        // Cancel block breaking in games (unless specifically allowed)
        event.isCancelled = true
    }
    
    @EventHandler(priority = EventPriority.HIGH)
    fun onBlockPlace(event: BlockPlaceEvent) {
        val player = event.player
        val game = plugin.gameManager.getPlayerGame(player) ?: return
        
        // Cancel block placing in games (unless specifically allowed)
        // For example, cobwebs might be allowed in 1v1 games
        val block = event.block
        if (block.type.name.contains("COBWEB") && game.gameName == "1v1") {
            // Allow cobweb placement in 1v1 games
            return
        }
        
        event.isCancelled = true
    }
    
    @EventHandler(priority = EventPriority.HIGH)
    fun onPlayerDropItem(event: PlayerDropItemEvent) {
        val player = event.player
        val game = plugin.gameManager.getPlayerGame(player) ?: return
        
        // Cancel item dropping during countdown or for spectators
        if (game.state != GameState.ACTIVE || game.hasSpectator(player)) {
            event.isCancelled = true
        }
    }
    
    @EventHandler(priority = EventPriority.HIGH)
    fun onEntityPickupItem(event: org.bukkit.event.entity.EntityPickupItemEvent) {
        if (event.entity !is Player) return
        
        val player = event.entity as Player
        val game = plugin.gameManager.getPlayerGame(player) ?: return
        
        // Cancel item pickup for spectators
        if (game.hasSpectator(player)) {
            event.isCancelled = true
        }
    }
    
    @EventHandler(priority = EventPriority.HIGH)
    fun onInventoryClick(event: InventoryClickEvent) {
        if (event.whoClicked !is Player) return
        
        val player = event.whoClicked as Player
        val game = plugin.gameManager.getPlayerGame(player) ?: return
        
        // Cancel inventory interactions for spectators
        if (game.hasSpectator(player)) {
            event.isCancelled = true
        }
        
        // Cancel inventory interactions during countdown
        if (game.state == GameState.STARTING || game.state == GameState.WAITING) {
            event.isCancelled = true
        }
    }
}