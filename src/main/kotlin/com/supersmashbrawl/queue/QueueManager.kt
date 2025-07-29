package com.supersmashbrawl.queue

import com.supersmashbrawl.SuperSmashBrawlPlugin
import com.supersmashbrawl.game.GameManager
import com.supersmashbrawl.utils.MessageUtils
import org.bukkit.entity.Player
import org.bukkit.scheduler.BukkitTask
import java.util.concurrent.ConcurrentHashMap

class QueueManager(private val plugin: SuperSmashBrawlPlugin) {
    
    private val queues = ConcurrentHashMap<String, GameQueue>()
    private val playerQueues = ConcurrentHashMap<String, String>() // Player UUID -> Queue Type
    private var matchmakingTask: BukkitTask? = null
    
    init {
        startMatchmakingTask()
    }
    
    /**
     * Register a new queue type
     */
    fun registerQueue(queue: GameQueue) {
        queues[queue.queueType] = queue
        plugin.logger.info("Registered queue: ${queue.queueType}")
    }
    
    /**
     * Join a queue
     */
    fun joinQueue(player: Player, queueType: String): Boolean {
        val queue = queues[queueType] ?: return false
        
        // Check if player is already in a queue
        if (isPlayerInAnyQueue(player)) {
            player.sendMessage(MessageUtils.formatMessage("queue.already-in-queue"))
            return false
        }
        
        // Check if player is already in a game
        if (plugin.gameManager.isPlayerInGame(player)) {
            player.sendMessage(MessageUtils.formatMessage("error.already-in-game"))
            return false
        }
        
        // Add player to queue
        if (queue.addPlayer(player)) {
            playerQueues[player.uniqueId.toString()] = queueType
            
            val position = queue.getPlayerPosition(player)
            val queueSize = queue.getQueueSize()
            
            player.sendMessage(MessageUtils.formatMessage("queue.joined"))
            player.sendMessage(MessageUtils.formatMessage("queue.position", mapOf(
                "position" to position.toString(),
                "total" to queueSize.toString()
            )))
            
            return true
        }
        
        return false
    }
    
    /**
     * Leave a queue
     */
    fun leaveQueue(player: Player): Boolean {
        val queueType = playerQueues[player.uniqueId.toString()] ?: return false
        val queue = queues[queueType] ?: return false
        
        if (queue.removePlayer(player)) {
            playerQueues.remove(player.uniqueId.toString())
            player.sendMessage(MessageUtils.formatMessage("queue.left"))
            return true
        }
        
        return false
    }
    
    /**
     * Check if a player is in any queue
     */
    fun isPlayerInAnyQueue(player: Player): Boolean {
        return playerQueues.containsKey(player.uniqueId.toString())
    }
    
    /**
     * Get the queue a player is in
     */
    fun getPlayerQueue(player: Player): GameQueue? {
        val queueType = playerQueues[player.uniqueId.toString()] ?: return null
        return queues[queueType]
    }
    
    /**
     * Remove player from all queues (for cleanup when player leaves)
     */
    fun removePlayerFromAllQueues(player: Player) {
        val queueType = playerQueues.remove(player.uniqueId.toString()) ?: return
        val queue = queues[queueType] ?: return
        queue.removePlayer(player)
    }
    
    /**
     * Get all available queue types
     */
    fun getAvailableQueueTypes(): Set<String> = queues.keys
    
    /**
     * Get a specific queue
     */
    fun getQueue(queueType: String): GameQueue? = queues[queueType]
    
    /**
     * Get all queues
     */
    fun getAllQueues(): Map<String, GameQueue> = queues.toMap()
    
    /**
     * Get queue statistics
     */
    fun getQueueStats(): List<GameQueue.QueueStats> {
        return queues.values.map { it.getStats() }
    }
    
    /**
     * Start the matchmaking task
     */
    private fun startMatchmakingTask() {
        matchmakingTask = plugin.server.scheduler.runTaskTimer(plugin, Runnable {
            processMatchmaking()
        }, 20L, 20L) // Run every second
    }
    
    /**
     * Process matchmaking for all queues
     */
    private fun processMatchmaking() {
        for (queue in queues.values) {
            try {
                // Clean up invalid players
                queue.cleanupInvalidPlayers()
                
                // Try to form matches
                while (queue.canFormMatch()) {
                    val game = queue.tryFormMatch()
                    if (game != null) {
                        // Notify players
                        game.players.forEach { player ->
                            player.sendMessage(MessageUtils.formatMessage("queue.match-found"))
                            playerQueues.remove(player.uniqueId.toString())
                        }
                        
                        // Start the game
                        plugin.gameManager.startGame(game)
                    } else {
                        break // Couldn't form a match, try again next cycle
                    }
                }
                
                // Send position updates to players who have been waiting
                updatePlayerPositions(queue)
                
            } catch (e: Exception) {
                plugin.logger.warning("Error during matchmaking for queue ${queue.queueType}: ${e.message}")
            }
        }
    }
    
    /**
     * Update position information for players in queue
     */
    private fun updatePlayerPositions(queue: GameQueue) {
        val queuedPlayers = queue.getQueuedPlayers()
        
        queuedPlayers.forEachIndexed { index, player ->
            // Only send position updates periodically (every 10 seconds)
            if (System.currentTimeMillis() % 10000 < 1000) {
                val position = index + 1
                val queueSize = queuedPlayers.size
                
                player.sendMessage(MessageUtils.formatMessage("queue.position", mapOf(
                    "position" to position.toString(),
                    "total" to queueSize.toString()
                )))
            }
        }
    }
    
    /**
     * Handle player quit event
     */
    fun handlePlayerQuit(player: Player) {
        removePlayerFromAllQueues(player)
    }
    
    /**
     * Shutdown the queue manager
     */
    fun shutdown() {
        matchmakingTask?.cancel()
        
        // Clear all queues
        queues.values.forEach { it.clear() }
        playerQueues.clear()
        
        plugin.logger.info("Queue manager shutdown completed")
    }
    
    /**
     * Force a queue to try forming a match (for admin commands)
     */
    fun forceMatchmaking(queueType: String): Boolean {
        val queue = queues[queueType] ?: return false
        
        val game = queue.tryFormMatch()
        if (game != null) {
            game.players.forEach { player ->
                player.sendMessage(MessageUtils.formatMessage("queue.match-found"))
                playerQueues.remove(player.uniqueId.toString())
            }
            
            plugin.gameManager.startGame(game)
            return true
        }
        
        return false
    }
}