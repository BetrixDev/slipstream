package com.supersmashbrawl.game.impl

import com.supersmashbrawl.arena.Arena
import com.supersmashbrawl.game.abstracts.AbstractMinigame
import com.supersmashbrawl.utils.MessageUtils
import org.bukkit.Material
import org.bukkit.enchantments.Enchantment
import org.bukkit.entity.Player
import org.bukkit.inventory.ItemStack
import org.bukkit.potion.PotionEffect
import org.bukkit.potion.PotionEffectType

class OneVOneMinigame(
    arena: Arena,
    private val player1: Player,
    private val player2: Player
) : AbstractMinigame(arena, minPlayers = 2, maxPlayers = 2) {
    
    override val gameName: String = "1v1"
    
    private var roundCount = 0
    private val maxRounds = plugin.configManager.getInt("config", "game.max-rounds")
    private val player1Wins = mutableSetOf<Int>()
    private val player2Wins = mutableSetOf<Int>()
    
    override fun onGameStart() {
        roundCount = 1
        startNewRound()
    }
    
    override fun onGameEnd(winner: Player?) {
        // Display final results
        if (winner != null) {
            val winnerWins = if (winner == player1) player1Wins.size else player2Wins.size
            val loserWins = if (winner == player1) player2Wins.size else player1Wins.size
            
            broadcast(MessageUtils.formatMessage("game.final-score", mapOf(
                "winner" to winner.name,
                "winner_score" to winnerWins.toString(),
                "loser_score" to loserWins.toString()
            )))
        }
        
        // Give rewards/experience
        giveRewards(winner)
    }
    
    override fun onGameStop(reason: String?) {
        // Clean up any ongoing effects
        _players.forEach { player ->
            player.activePotionEffects.forEach { effect ->
                player.removePotionEffect(effect.type)
            }
        }
    }
    
    override fun onPlayerDeath(player: Player, killer: Player?) {
        val winner = if (player == player1) player2 else player1
        
        // Record round win
        if (winner == player1) {
            player1Wins.add(roundCount)
        } else {
            player2Wins.add(roundCount)
        }
        
        broadcast(MessageUtils.formatMessage("game.round-winner", mapOf(
            "winner" to winner.name,
            "round" to roundCount.toString()
        )))
        
        // Check if game should end
        val bestOfRounds = (maxRounds / 2) + 1
        if (player1Wins.size >= bestOfRounds || player2Wins.size >= bestOfRounds) {
            val gameWinner = if (player1Wins.size >= bestOfRounds) player1 else player2
            end(gameWinner)
        } else if (roundCount >= maxRounds) {
            // Determine winner by most rounds won
            val gameWinner = when {
                player1Wins.size > player2Wins.size -> player1
                player2Wins.size > player1Wins.size -> player2
                else -> null // Draw
            }
            end(gameWinner)
        } else {
            // Start next round
            roundCount++
            plugin.server.scheduler.runTaskLater(plugin, Runnable {
                if (state == GameState.ACTIVE) { // Check if game is still active
                    startNewRound()
                }
            }, 60L) // 3 second delay before next round
        }
    }
    
    override fun onPlayerSetup(player: Player) {
        // Give standard 1v1 equipment
        giveStandardKit(player)
        
        // Apply starting effects
        player.addPotionEffect(PotionEffect(PotionEffectType.SATURATION, 20 * 30, 0, false, false))
        player.addPotionEffect(PotionEffect(PotionEffectType.REGENERATION, 20 * 5, 1, false, false))
    }
    
    override fun onTick() {
        // Check for out of bounds players
        _alivePlayers.toList().forEach { player ->
            if (!arena.isLocationInArena(player.location)) {
                // Teleport back to arena or handle as death
                handlePlayerDeath(player)
            }
        }
        
        // Update scoreboard/action bar with round info
        updatePlayerHUD()
    }
    
    private fun startNewRound() {
        // Reset players
        _alivePlayers.clear()
        _alivePlayers.addAll(_players)
        
        // Teleport players to spawn points
        _players.forEachIndexed { index, player ->
            val spawnPoint = arena.spawnPoints.getOrElse(index) { arena.center }
            player.teleport(spawnPoint)
            
            // Reset player state
            setupPlayer(player)
        }
        
        broadcast(MessageUtils.formatMessage("game.round-starting", mapOf(
            "round" to roundCount.toString(),
            "max_rounds" to maxRounds.toString()
        )))
        
        // Brief immunity period
        _players.forEach { player ->
            player.addPotionEffect(PotionEffect(PotionEffectType.DAMAGE_RESISTANCE, 20 * 3, 4, false, false))
            player.addPotionEffect(PotionEffect(PotionEffectType.SLOW, 20 * 3, 2, false, false))
        }
        
        // Start round after immunity period
        plugin.server.scheduler.runTaskLater(plugin, Runnable {
            _players.forEach { player ->
                player.removePotionEffect(PotionEffectType.DAMAGE_RESISTANCE)
                player.removePotionEffect(PotionEffectType.SLOW)
            }
            broadcast(MessageUtils.formatMessage("game.round-started"))
        }, 60L)
    }
    
    private fun giveStandardKit(player: Player) {
        val inventory = player.inventory
        inventory.clear()
        
        // Weapons
        val sword = ItemStack(Material.IRON_SWORD)
        sword.addEnchantment(Enchantment.SHARPNESS, 1)
        inventory.setItem(0, sword)
        
        val bow = ItemStack(Material.BOW)
        bow.addEnchantment(Enchantment.POWER, 1)
        inventory.setItem(1, bow)
        
        // Arrows
        inventory.setItem(2, ItemStack(Material.ARROW, 32))
        
        // Food
        inventory.setItem(3, ItemStack(Material.GOLDEN_APPLE, 3))
        inventory.setItem(4, ItemStack(Material.COOKED_BEEF, 16))
        
        // Utility
        inventory.setItem(5, ItemStack(Material.ENDER_PEARL, 2))
        inventory.setItem(6, ItemStack(Material.COBWEB, 4))
        
        // Potions
        inventory.setItem(7, ItemStack(Material.SPLASH_POTION)) // Health potion
        inventory.setItem(8, ItemStack(Material.SPLASH_POTION)) // Speed potion
        
        // Armor
        inventory.helmet = ItemStack(Material.IRON_HELMET)
        inventory.chestplate = ItemStack(Material.IRON_CHESTPLATE)
        inventory.leggings = ItemStack(Material.IRON_LEGGINGS)
        inventory.boots = ItemStack(Material.IRON_BOOTS)
        
        // Shield
        inventory.setItemInOffHand(ItemStack(Material.SHIELD))
    }
    
    private fun updatePlayerHUD() {
        _players.forEach { player ->
            val opponent = if (player == player1) player2 else player1
            val playerWins = if (player == player1) player1Wins.size else player2Wins.size
            val opponentWins = if (player == player1) player2Wins.size else player1Wins.size
            
            player.sendActionBar(MessageUtils.formatMessage("game.round-hud", mapOf(
                "round" to roundCount.toString(),
                "player_wins" to playerWins.toString(),
                "opponent" to opponent.name,
                "opponent_wins" to opponentWins.toString()
            )))
        }
    }
    
    private fun giveRewards(winner: Player?) {
        if (winner == null) {
            // Draw rewards
            _players.forEach { player ->
                giveDrawRewards(player)
            }
        } else {
            // Winner rewards
            giveWinnerRewards(winner)
            
            // Loser rewards
            val loser = if (winner == player1) player2 else player1
            giveLoserRewards(loser)
        }
    }
    
    private fun giveWinnerRewards(player: Player) {
        // Implementation depends on economy/reward system
        player.sendMessage(MessageUtils.formatMessage("rewards.winner"))
        
        // Example: Give experience, money, items, etc.
        // plugin.economyManager.addMoney(player, 100)
        // player.giveExp(50)
    }
    
    private fun giveLoserRewards(player: Player) {
        player.sendMessage(MessageUtils.formatMessage("rewards.loser"))
        
        // Give consolation rewards
        // plugin.economyManager.addMoney(player, 25)
        // player.giveExp(10)
    }
    
    private fun giveDrawRewards(player: Player) {
        player.sendMessage(MessageUtils.formatMessage("rewards.draw"))
        
        // Give draw rewards
        // plugin.economyManager.addMoney(player, 50)
        // player.giveExp(25)
    }
}