package com.supersmashbrawl.game.abstracts

import com.supersmashbrawl.SuperSmashBrawlPlugin
import com.supersmashbrawl.arena.Arena
import com.supersmashbrawl.game.GameState
import com.supersmashbrawl.game.interfaces.IMinigame
import com.supersmashbrawl.utils.MessageUtils
import org.bukkit.GameMode
import org.bukkit.entity.Player
import org.bukkit.scheduler.BukkitTask
import java.util.*
import java.util.concurrent.ConcurrentHashMap

abstract class AbstractMinigame(
    override val arena: Arena,
    override val minPlayers: Int = 2,
    override val maxPlayers: Int = 2
) : IMinigame {
    
    override val gameId: UUID = UUID.randomUUID()
    override var state: GameState = GameState.WAITING
        protected set
    
    protected val plugin = SuperSmashBrawlPlugin.instance
    protected val _players = mutableSetOf<Player>()
    protected val _alivePlayers = mutableSetOf<Player>()
    protected val _spectators = mutableSetOf<Player>()
    
    override val players: List<Player>
        get() = _players.toList()
    override val alivePlayers: List<Player>
        get() = _alivePlayers.toList()
    override val spectators: List<Player>
        get() = _spectators.toList()
    
    protected var startTime: Long = 0
    protected var gameTask: BukkitTask? = null
    protected var countdownTask: BukkitTask? = null
    
    // Player data storage for restoration after game
    protected val playerData = ConcurrentHashMap<UUID, PlayerData>()
    
    override fun addPlayer(player: Player): Boolean {
        if (state != GameState.WAITING || isFull() || hasPlayer(player)) {
            return false
        }
        
        // Store player data for restoration
        storePlayerData(player)
        
        _players.add(player)
        _alivePlayers.add(player)
        
        // Teleport player to arena
        teleportToArena(player)
        
        // Setup player for game
        setupPlayer(player)
        
        broadcast(MessageUtils.formatMessage("game.player-joined", mapOf("player" to player.name)))
        
        // Check if we can start the game
        if (canStart()) {
            startCountdown()
        }
        
        return true
    }
    
    override fun removePlayer(player: Player, reason: String?) {
        if (!hasPlayer(player)) return
        
        _players.remove(player)
        _alivePlayers.remove(player)
        
        // Restore player data
        restorePlayerData(player)
        
        val reasonText = reason?.let { " ($it)" } ?: ""
        broadcast(MessageUtils.formatMessage("game.player-left", mapOf("player" to player.name, "reason" to reasonText)))
        
        // Check if game should end
        checkGameEnd()
    }
    
    override fun addSpectator(player: Player) {
        if (hasSpectator(player)) return
        
        _spectators.add(player)
        
        // Store player data
        storePlayerData(player)
        
        // Setup spectator
        player.gameMode = GameMode.SPECTATOR
        player.teleport(arena.spectatorSpawn ?: arena.center)
        
        player.sendMessage(MessageUtils.formatMessage("game.spectating"))
    }
    
    override fun removeSpectator(player: Player) {
        if (!hasSpectator(player)) return
        
        _spectators.remove(player)
        restorePlayerData(player)
    }
    
    override fun hasPlayer(player: Player): Boolean = _players.contains(player)
    
    override fun hasSpectator(player: Player): Boolean = _spectators.contains(player)
    
    override fun canStart(): Boolean = _players.size >= minPlayers && state == GameState.WAITING
    
    override fun isFull(): Boolean = _players.size >= maxPlayers
    
    override fun getDuration(): Long {
        return if (startTime > 0) (System.currentTimeMillis() - startTime) / 1000 else -1
    }
    
    override fun broadcast(message: String) {
        val formattedMessage = MessageUtils.formatMessage(message)
        (_players + _spectators).forEach { player ->
            player.sendMessage(formattedMessage)
        }
    }
    
    override fun start(): Boolean {
        if (state != GameState.STARTING || !canStart()) {
            return false
        }
        
        state = GameState.ACTIVE
        startTime = System.currentTimeMillis()
        
        // Cancel countdown task
        countdownTask?.cancel()
        
        // Start game tick task
        gameTask = plugin.server.scheduler.runTaskTimer(plugin, Runnable {
            tick()
        }, 0L, 20L) // Run every second
        
        // Perform game-specific start logic
        onGameStart()
        
        broadcast(MessageUtils.formatMessage("game.started"))
        
        return true
    }
    
    override fun stop(reason: String?) {
        if (state == GameState.FINISHED) return
        
        state = GameState.ENDING
        
        // Cancel all tasks
        gameTask?.cancel()
        countdownTask?.cancel()
        
        // Perform cleanup
        onGameStop(reason)
        
        // Remove all players and spectators
        _players.toList().forEach { removePlayer(it, reason) }
        _spectators.toList().forEach { removeSpectator(it) }
        
        state = GameState.FINISHED
        
        // Mark arena as available
        arena.isInUse = false
        
        val reasonText = reason?.let { " (Reason: $it)" } ?: ""
        plugin.logger.info("Game ${gameId} stopped$reasonText")
    }
    
    override fun end(winner: Player?) {
        if (state == GameState.FINISHED) return
        
        state = GameState.ENDING
        
        // Cancel tasks
        gameTask?.cancel()
        
        // Perform end logic
        onGameEnd(winner)
        
        // Announce winner
        if (winner != null) {
            broadcast(MessageUtils.formatMessage("game.winner", mapOf("winner" to winner.name)))
        } else {
            broadcast(MessageUtils.formatMessage("game.draw"))
        }
        
        broadcast(MessageUtils.formatMessage("game.ended"))
        
        // Schedule cleanup after a delay
        plugin.server.scheduler.runTaskLater(plugin, Runnable {
            stop("Game ended")
        }, 100L) // 5 second delay
    }
    
    override fun handlePlayerDeath(player: Player, killer: Player?) {
        if (!hasPlayer(player)) return
        
        _alivePlayers.remove(player)
        
        // Perform game-specific death handling
        onPlayerDeath(player, killer)
        
        // Check if game should end
        checkGameEnd()
    }
    
    override fun handlePlayerQuit(player: Player) {
        removePlayer(player, "Quit")
    }
    
    override fun tick() {
        if (state != GameState.ACTIVE) return
        
        // Check for game timeout
        val maxDuration = plugin.configManager.getInt("config", "game.max-duration-minutes") * 60
        if (getDuration() >= maxDuration) {
            end(null) // End in draw due to timeout
            return
        }
        
        // Perform game-specific tick logic
        onTick()
    }
    
    protected fun startCountdown() {
        if (state != GameState.WAITING) return
        
        state = GameState.STARTING
        
        val countdownSeconds = plugin.configManager.getInt("config", "game.countdown-seconds")
        var remaining = countdownSeconds
        
        countdownTask = plugin.server.scheduler.runTaskTimer(plugin, Runnable {
            if (remaining <= 0) {
                start()
                return@Runnable
            }
            
            if (remaining <= 5 || remaining % 5 == 0) {
                broadcast(MessageUtils.formatMessage("game.starting", mapOf("countdown" to remaining.toString())))
            }
            
            remaining--
        }, 0L, 20L)
    }
    
    protected fun checkGameEnd() {
        if (state != GameState.ACTIVE) return
        
        when {
            _alivePlayers.isEmpty() -> end(null) // Draw
            _alivePlayers.size == 1 -> end(_alivePlayers.first()) // Winner
            _players.size < minPlayers -> stop("Not enough players")
        }
    }
    
    protected fun teleportToArena(player: Player) {
        val spawnPoints = arena.spawnPoints
        if (spawnPoints.isNotEmpty()) {
            val spawnIndex = _players.size - 1
            val spawn = spawnPoints.getOrElse(spawnIndex % spawnPoints.size) { arena.center }
            player.teleport(spawn)
        } else {
            player.teleport(arena.center)
        }
    }
    
    protected fun setupPlayer(player: Player) {
        player.gameMode = GameMode.SURVIVAL
        player.health = player.maxHealth
        player.foodLevel = 20
        player.saturation = 20f
        player.isFlying = false
        player.allowFlight = false
        player.inventory.clear()
        
        // Remove all potion effects
        player.activePotionEffects.forEach { effect ->
            player.removePotionEffect(effect.type)
        }
        
        // Game-specific player setup
        onPlayerSetup(player)
    }
    
    protected fun storePlayerData(player: Player) {
        playerData[player.uniqueId] = PlayerData(
            location = player.location,
            gameMode = player.gameMode,
            health = player.health,
            foodLevel = player.foodLevel,
            saturation = player.saturation,
            inventory = player.inventory.contents.clone(),
            armor = player.inventory.armorContents.clone(),
            experience = player.exp,
            level = player.level,
            allowFlight = player.allowFlight,
            isFlying = player.isFlying
        )
    }
    
    protected fun restorePlayerData(player: Player) {
        val data = playerData.remove(player.uniqueId) ?: return
        
        player.teleport(data.location)
        player.gameMode = data.gameMode
        player.health = data.health
        player.foodLevel = data.foodLevel
        player.saturation = data.saturation
        player.inventory.contents = data.inventory
        player.inventory.armorContents = data.armor
        player.exp = data.experience
        player.level = data.level
        player.allowFlight = data.allowFlight
        player.isFlying = data.isFlying
    }
    
    // Abstract methods for game-specific implementation
    protected abstract fun onGameStart()
    protected abstract fun onGameEnd(winner: Player?)
    protected abstract fun onGameStop(reason: String?)
    protected abstract fun onPlayerDeath(player: Player, killer: Player?)
    protected abstract fun onPlayerSetup(player: Player)
    protected abstract fun onTick()
    
    data class PlayerData(
        val location: org.bukkit.Location,
        val gameMode: GameMode,
        val health: Double,
        val foodLevel: Int,
        val saturation: Float,
        val inventory: Array<org.bukkit.inventory.ItemStack?>,
        val armor: Array<org.bukkit.inventory.ItemStack?>,
        val experience: Float,
        val level: Int,
        val allowFlight: Boolean,
        val isFlying: Boolean
    )
}