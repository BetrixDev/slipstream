package com.supersmashbrawl.game.interfaces

import com.supersmashbrawl.arena.Arena
import com.supersmashbrawl.game.GameState
import org.bukkit.entity.Player
import java.util.*

interface IMinigame {
    
    /**
     * Unique identifier for this game instance
     */
    val gameId: UUID
    
    /**
     * Name of this minigame type
     */
    val gameName: String
    
    /**
     * Current state of the game
     */
    val state: GameState
    
    /**
     * Arena being used for this game
     */
    val arena: Arena
    
    /**
     * List of all players in this game
     */
    val players: List<Player>
    
    /**
     * List of alive players in this game
     */
    val alivePlayers: List<Player>
    
    /**
     * List of spectators watching this game
     */
    val spectators: List<Player>
    
    /**
     * Maximum number of players allowed
     */
    val maxPlayers: Int
    
    /**
     * Minimum number of players required
     */
    val minPlayers: Int
    
    /**
     * Start the game
     * @return true if game started successfully, false otherwise
     */
    fun start(): Boolean
    
    /**
     * Stop the game immediately
     * @param reason Optional reason for stopping
     */
    fun stop(reason: String? = null)
    
    /**
     * End the game gracefully
     * @param winner Optional winner of the game
     */
    fun end(winner: Player? = null)
    
    /**
     * Add a player to the game
     * @param player Player to add
     * @return true if player was added successfully
     */
    fun addPlayer(player: Player): Boolean
    
    /**
     * Remove a player from the game
     * @param player Player to remove
     * @param reason Optional reason for removal
     */
    fun removePlayer(player: Player, reason: String? = null)
    
    /**
     * Add a spectator to the game
     * @param player Player to add as spectator
     */
    fun addSpectator(player: Player)
    
    /**
     * Remove a spectator from the game
     * @param player Spectator to remove
     */
    fun removeSpectator(player: Player)
    
    /**
     * Check if a player is in this game
     * @param player Player to check
     * @return true if player is in this game
     */
    fun hasPlayer(player: Player): Boolean
    
    /**
     * Check if a player is spectating this game
     * @param player Player to check
     * @return true if player is spectating
     */
    fun hasSpectator(player: Player): Boolean
    
    /**
     * Check if the game can start
     * @return true if game can start
     */
    fun canStart(): Boolean
    
    /**
     * Check if the game is full
     * @return true if game is full
     */
    fun isFull(): Boolean
    
    /**
     * Get the duration of the game in seconds
     * @return game duration or -1 if not applicable
     */
    fun getDuration(): Long
    
    /**
     * Handle player death in the game
     * @param player Player who died
     * @param killer Player who killed (optional)
     */
    fun handlePlayerDeath(player: Player, killer: Player? = null)
    
    /**
     * Handle player quit during game
     * @param player Player who quit
     */
    fun handlePlayerQuit(player: Player)
    
    /**
     * Send a message to all players in the game
     * @param message Message to send
     */
    fun broadcast(message: String)
    
    /**
     * Update the game state (called periodically)
     */
    fun tick()
}