package com.supersmashbrawl.queue

import com.supersmashbrawl.game.interfaces.IMinigame
import org.bukkit.entity.Player
import java.util.*
import java.util.concurrent.ConcurrentLinkedQueue

class GameQueue(
    val queueType: String,
    val minPlayers: Int,
    val maxPlayers: Int,
    private val gameFactory: (List<Player>) -> IMinigame?
) {
    
    private val playerQueue = ConcurrentLinkedQueue<QueuedPlayer>()
    private val queuedPlayers = mutableSetOf<UUID>()
    
    /**
     * Add a player to the queue
     */
    fun addPlayer(player: Player): Boolean {
        if (isPlayerQueued(player)) {
            return false
        }
        
        val queuedPlayer = QueuedPlayer(player, System.currentTimeMillis())
        playerQueue.offer(queuedPlayer)
        queuedPlayers.add(player.uniqueId)
        
        return true
    }
    
    /**
     * Remove a player from the queue
     */
    fun removePlayer(player: Player): Boolean {
        if (!isPlayerQueued(player)) {
            return false
        }
        
        queuedPlayers.remove(player.uniqueId)
        playerQueue.removeIf { it.player.uniqueId == player.uniqueId }
        
        return true
    }
    
    /**
     * Check if a player is in this queue
     */
    fun isPlayerQueued(player: Player): Boolean {
        return queuedPlayers.contains(player.uniqueId)
    }
    
    /**
     * Get the position of a player in the queue (1-indexed)
     */
    fun getPlayerPosition(player: Player): Int {
        if (!isPlayerQueued(player)) return -1
        
        return playerQueue.indexOfFirst { it.player.uniqueId == player.uniqueId } + 1
    }
    
    /**
     * Get the current queue size
     */
    fun getQueueSize(): Int = playerQueue.size
    
    /**
     * Check if the queue can form a match
     */
    fun canFormMatch(): Boolean = playerQueue.size >= minPlayers
    
    /**
     * Try to form a match from queued players
     */
    fun tryFormMatch(): IMinigame? {
        if (!canFormMatch()) return null
        
        val playersForMatch = mutableListOf<Player>()
        val playersToRemove = mutableListOf<QueuedPlayer>()
        
        // Get players for the match
        val iterator = playerQueue.iterator()
        while (iterator.hasNext() && playersForMatch.size < maxPlayers) {
            val queuedPlayer = iterator.next()
            
            // Check if player is still online and valid
            if (queuedPlayer.player.isOnline && queuedPlayer.isValid()) {
                playersForMatch.add(queuedPlayer.player)
                playersToRemove.add(queuedPlayer)
            } else {
                // Remove invalid players
                iterator.remove()
                queuedPlayers.remove(queuedPlayer.player.uniqueId)
            }
        }
        
        // Need at least minimum players
        if (playersForMatch.size < minPlayers) {
            return null
        }
        
        // Remove players from queue
        playersToRemove.forEach { queuedPlayer ->
            playerQueue.remove(queuedPlayer)
            queuedPlayers.remove(queuedPlayer.player.uniqueId)
        }
        
        // Create the game
        return gameFactory(playersForMatch)
    }
    
    /**
     * Get all queued players
     */
    fun getQueuedPlayers(): List<Player> {
        return playerQueue.map { it.player }
    }
    
    /**
     * Clean up invalid players from the queue
     */
    fun cleanupInvalidPlayers() {
        val invalidPlayers = mutableListOf<QueuedPlayer>()
        
        for (queuedPlayer in playerQueue) {
            if (!queuedPlayer.player.isOnline || !queuedPlayer.isValid()) {
                invalidPlayers.add(queuedPlayer)
            }
        }
        
        invalidPlayers.forEach { queuedPlayer ->
            playerQueue.remove(queuedPlayer)
            queuedPlayers.remove(queuedPlayer.player.uniqueId)
        }
    }
    
    /**
     * Clear the entire queue
     */
    fun clear() {
        playerQueue.clear()
        queuedPlayers.clear()
    }
    
    /**
     * Get queue statistics
     */
    fun getStats(): QueueStats {
        val averageWaitTime = if (playerQueue.isEmpty()) 0L else {
            val currentTime = System.currentTimeMillis()
            playerQueue.map { currentTime - it.joinTime }.average().toLong()
        }
        
        val longestWaitTime = if (playerQueue.isEmpty()) 0L else {
            val currentTime = System.currentTimeMillis()
            playerQueue.maxOf { currentTime - it.joinTime }
        }
        
        return QueueStats(
            queueType = queueType,
            currentSize = playerQueue.size,
            averageWaitTime = averageWaitTime,
            longestWaitTime = longestWaitTime
        )
    }
    
    data class QueuedPlayer(
        val player: Player,
        val joinTime: Long
    ) {
        fun getWaitTime(): Long = System.currentTimeMillis() - joinTime
        
        fun isValid(): Boolean {
            return player.isOnline && !player.isDead
        }
    }
    
    data class QueueStats(
        val queueType: String,
        val currentSize: Int,
        val averageWaitTime: Long,
        val longestWaitTime: Long
    )
}