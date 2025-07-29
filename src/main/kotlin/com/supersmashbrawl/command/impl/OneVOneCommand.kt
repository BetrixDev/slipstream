package com.supersmashbrawl.command.impl

import com.supersmashbrawl.SuperSmashBrawlPlugin
import com.supersmashbrawl.utils.MessageUtils
import org.bukkit.command.Command
import org.bukkit.command.CommandExecutor
import org.bukkit.command.CommandSender
import org.bukkit.command.TabCompleter
import org.bukkit.entity.Player

class OneVOneCommand(private val plugin: SuperSmashBrawlPlugin) : CommandExecutor, TabCompleter {
    
    override fun onCommand(sender: CommandSender, command: Command, label: String, args: Array<out String>): Boolean {
        if (sender !is Player) {
            sender.sendMessage(MessageUtils.formatMessage("error.player-only"))
            return true
        }
        
        if (!sender.hasPermission("supersmashbrawl.join")) {
            sender.sendMessage(MessageUtils.formatMessage("error.no-permission"))
            return true
        }
        
        if (args.isEmpty()) {
            return handle1v1Join(sender)
        }
        
        when (args[0].lowercase()) {
            "join" -> handle1v1Join(sender)
            "leave" -> handle1v1Leave(sender)
            "status" -> handle1v1Status(sender)
            "help" -> show1v1Help(sender)
            else -> {
                sender.sendMessage(MessageUtils.formatMessage("error.unknown-command"))
                show1v1Help(sender)
            }
        }
        
        return true
    }
    
    override fun onTabComplete(sender: CommandSender, command: Command, alias: String, args: Array<out String>): List<String> {
        if (args.size == 1) {
            return listOf("join", "leave", "status", "help").filter { it.startsWith(args[0].lowercase()) }
        }
        return emptyList()
    }
    
    private fun handle1v1Join(player: Player): Boolean {
        // Check if arenas are available
        if (plugin.arenaManager.getAvailableArenaCount() == 0) {
            player.sendMessage(MessageUtils.formatMessage("error.no-arena-available"))
            return true
        }
        
        // Try to join the queue
        if (plugin.queueManager.joinQueue(player, "1v1")) {
            val queue = plugin.queueManager.getQueue("1v1")
            val position = queue?.getPlayerPosition(player) ?: -1
            val queueSize = queue?.getQueueSize() ?: 0
            
            player.sendMessage(MessageUtils.formatMessage("queue.joined"))
            if (position > 0) {
                player.sendMessage(MessageUtils.formatMessage("queue.position", mapOf(
                    "position" to position.toString(),
                    "total" to queueSize.toString()
                )))
            }
        } else {
            // Failed to join queue - error message already sent by QueueManager
        }
        
        return true
    }
    
    private fun handle1v1Leave(player: Player): Boolean {
        if (plugin.queueManager.leaveQueue(player)) {
            player.sendMessage(MessageUtils.formatMessage("queue.left"))
        } else {
            player.sendMessage(MessageUtils.formatMessage("queue.not-in-queue"))
        }
        
        return true
    }
    
    private fun handle1v1Status(player: Player): Boolean {
        val queue = plugin.queueManager.getPlayerQueue(player)
        
        if (queue == null) {
            player.sendMessage(MessageUtils.formatMessage("queue.not-in-queue"))
            return true
        }
        
        val position = queue.getPlayerPosition(player)
        val queueSize = queue.getQueueSize()
        val stats = queue.getStats()
        
        player.sendMessage(MessageUtils.createSeparator())
        player.sendMessage(MessageUtils.centerMessage("&6&l1v1 Queue Status"))
        player.sendMessage("")
        player.sendMessage("&eYour Position: &f$position &7/ &f$queueSize")
        player.sendMessage("&eQueue Type: &f${queue.queueType}")
        player.sendMessage("&eAverage Wait: &f${MessageUtils.formatDuration(stats.averageWaitTime)}")
        player.sendMessage("&eAvailable Arenas: &f${plugin.arenaManager.getAvailableArenaCount()}")
        player.sendMessage(MessageUtils.createSeparator())
        
        return true
    }
    
    private fun show1v1Help(player: Player) {
        player.sendMessage(MessageUtils.createSeparator())
        player.sendMessage(MessageUtils.centerMessage("&6&l1v1 Commands"))
        player.sendMessage("")
        player.sendMessage("&e/1v1 &7or &e/1v1 join &7- Join the 1v1 queue")
        player.sendMessage("&e/1v1 leave &7- Leave the 1v1 queue")
        player.sendMessage("&e/1v1 status &7- Check your queue status")
        player.sendMessage("&e/1v1 help &7- Show this help message")
        player.sendMessage(MessageUtils.createSeparator())
    }
}