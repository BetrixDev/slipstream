package com.supersmashbrawl.game

import com.supersmashbrawl.SuperSmashBrawlPlugin
import com.supersmashbrawl.arena.Arena
import com.supersmashbrawl.game.interfaces.IMinigame
import com.supersmashbrawl.queue.GameQueue
import com.supersmashbrawl.game.impl.OneVOneMinigame
import org.bukkit.entity.Player
import java.util.*
import java.util.concurrent.ConcurrentHashMap

class GameManager(private val plugin: SuperSmashBrawlPlugin) {
    
    private val activeGames = ConcurrentHashMap<UUID, IMinigame>()
    private val playerGames = ConcurrentHashMap<UUID, UUID>() // Player UUID -> Game UUID
    
    init {
        registerGameTypes()
    }
    
    /**
     * Register all game types with the queue manager
     */
    private fun registerGameTypes() {
        // Register 1v1 queue
        val oneVOneQueue = GameQueue(
            queueType = "1v1",
            minPlayers = 2,
            maxPlayers = 2
        ) { players ->
            create1v1Game(players)
        }
        
        plugin.queueManager.registerQueue(oneVOneQueue)
    }
    
    /**
     * Create a 1v1 game
     */
    private fun create1v1Game(players: List<Player>): IMinigame? {
        if (players.size != 2) return null
        
        val arena = plugin.arenaManager.getRandomAvailableArena() ?: return null
        
        if (!plugin.arenaManager.markArenaInUse(arena)) {
            return null
        }
        
        return OneVOneMinigame(arena, players[0], players[1])
    }
    
    /**
     * Start a game
     */
    fun startGame(game: IMinigame): Boolean {
        if (activeGames.containsKey(game.gameId)) {
            return false
        }
        
        // Add players to tracking
        game.players.forEach { player ->
            playerGames[player.uniqueId] = game.gameId
        }
        
        activeGames[game.gameId] = game
        
        // Add players to the game (this will handle teleportation and setup)
        game.players.forEach { player ->
            game.addPlayer(player)
        }
        
        plugin.logger.info("Started ${game.gameName} game ${game.gameId} with ${game.players.size} players")
        return true
    }
    
    /**
     * End a game
     */
    fun endGame(gameId: UUID, reason: String? = null): Boolean {
        val game = activeGames.remove(gameId) ?: return false
        
        // Remove players from tracking
        game.players.forEach { player ->
            playerGames.remove(player.uniqueId)
        }
        
        // Stop the game
        game.stop(reason)
        
        plugin.logger.info("Ended game ${gameId}${reason?.let { " - $it" } ?: ""}")
        return true
    }
    
    /**
     * Get an active game by ID
     */
    fun getGame(gameId: UUID): IMinigame? = activeGames[gameId]
    
    /**
     * Get the game a player is in
     */
    fun getPlayerGame(player: Player): IMinigame? {
        val gameId = playerGames[player.uniqueId] ?: return null
        return activeGames[gameId]
    }
    
    /**
     * Check if a player is in a game
     */
    fun isPlayerInGame(player: Player): Boolean = playerGames.containsKey(player.uniqueId)
    
    /**
     * Remove a player from their current game
     */
    fun removePlayerFromGame(player: Player, reason: String? = null): Boolean {
        val game = getPlayerGame(player) ?: return false
        
        game.removePlayer(player, reason)
        playerGames.remove(player.uniqueId)
        
        return true
    }
    
    /**
     * Handle player quit event
     */
    fun handlePlayerQuit(player: Player) {
        val game = getPlayerGame(player) ?: return
        game.handlePlayerQuit(player)
        playerGames.remove(player.uniqueId)
    }
    
    /**
     * Handle player death event
     */
    fun handlePlayerDeath(player: Player, killer: Player? = null) {
        val game = getPlayerGame(player) ?: return
        game.handlePlayerDeath(player, killer)
    }
    
    /**
     * Get all active games
     */
    fun getActiveGames(): List<IMinigame> = activeGames.values.toList()
    
    /**
     * Get active game count
     */
    fun getActiveGameCount(): Int = activeGames.size
    
    /**
     * Get active games by type
     */
    fun getActiveGamesByType(gameName: String): List<IMinigame> {
        return activeGames.values.filter { it.gameName == gameName }
    }
    
    /**
     * Force stop all games
     */
    fun stopAllGames(reason: String = "Server shutdown") {
        val gameIds = activeGames.keys.toList()
        gameIds.forEach { gameId ->
            endGame(gameId, reason)
        }
    }
    
    /**
     * Get game statistics
     */
    fun getGameStats(): GameStats {
        val gamesByType = activeGames.values.groupBy { it.gameName }
        val totalPlayers = activeGames.values.sumOf { it.players.size }
        
        return GameStats(
            totalActiveGames = activeGames.size,
            totalActivePlayers = totalPlayers,
            gamesByType = gamesByType.mapValues { it.value.size }
        )
    }
    
    /**
     * Check if an arena is being used by any game
     */
    fun isArenaInUse(arena: Arena): Boolean {
        return activeGames.values.any { it.arena == arena }
    }
    
    /**
     * Find games using a specific arena
     */
    fun getGamesUsingArena(arena: Arena): List<IMinigame> {
        return activeGames.values.filter { it.arena == arena }
    }
    
    /**
     * Shutdown the game manager
     */
    fun shutdown() {
        plugin.logger.info("Shutting down game manager...")
        stopAllGames("Plugin shutdown")
        activeGames.clear()
        playerGames.clear()
        plugin.logger.info("Game manager shutdown completed")
    }
    
    /**
     * Clean up finished games
     */
    fun cleanupFinishedGames() {
        val finishedGames = activeGames.values.filter { it.state == GameState.FINISHED }
        finishedGames.forEach { game ->
            activeGames.remove(game.gameId)
            game.players.forEach { player ->
                playerGames.remove(player.uniqueId)
            }
        }
    }
    
    data class GameStats(
        val totalActiveGames: Int,
        val totalActivePlayers: Int,
        val gamesByType: Map<String, Int>
    )
}