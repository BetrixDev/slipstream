package com.supersmashbrawl.command.impl

import com.supersmashbrawl.SuperSmashBrawlPlugin
import com.supersmashbrawl.utils.MessageUtils
import org.bukkit.command.Command
import org.bukkit.command.CommandExecutor
import org.bukkit.command.CommandSender
import org.bukkit.command.TabCompleter

class QueueCommand(private val plugin: SuperSmashBrawlPlugin) : CommandExecutor, TabCompleter {
    
    override fun onCommand(sender: CommandSender, command: Command, label: String, args: Array<out String>): Boolean {
        if (!sender.hasPermission("supersmashbrawl.admin")) {
            sender.sendMessage(MessageUtils.formatMessage("error.no-permission"))
            return true
        }
        
        if (args.isEmpty()) {
            showQueueHelp(sender)
            return true
        }
        
        when (args[0].lowercase()) {
            "list" -> handleQueueList(sender)
            "stats" -> handleQueueStats(sender)
            "clear" -> handleQueueClear(sender, args)
            "force" -> handleQueueForce(sender, args)
            "help" -> showQueueHelp(sender)
            else -> {
                sender.sendMessage(MessageUtils.formatMessage("error.unknown-command"))
                showQueueHelp(sender)
            }
        }
        
        return true
    }
    
    override fun onTabComplete(sender: CommandSender, command: Command, alias: String, args: Array<out String>): List<String> {
        if (args.size == 1) {
            return listOf("list", "stats", "clear", "force", "help").filter { it.startsWith(args[0].lowercase()) }
        }
        
        if (args.size == 2) {
            when (args[0].lowercase()) {
                "clear", "force" -> {
                    return plugin.queueManager.getAvailableQueueTypes().filter { it.startsWith(args[1].lowercase()) }
                }
            }
        }
        
        return emptyList()
    }
    
    private fun handleQueueList(sender: CommandSender) {
        val queues = plugin.queueManager.getAllQueues()
        
        sender.sendMessage(MessageUtils.createSeparator())
        sender.sendMessage(MessageUtils.centerMessage("&6&lQueue List"))
        sender.sendMessage("")
        
        if (queues.isEmpty()) {
            sender.sendMessage("&cNo queues are registered")
        } else {
            queues.forEach { (type, queue) ->
                val queueSize = queue.getQueueSize()
                val players = queue.getQueuedPlayers()
                
                sender.sendMessage("&e$type Queue:")
                sender.sendMessage("  &7Players: &f$queueSize")
                sender.sendMessage("  &7Min/Max: &f${queue.minPlayers}/${queue.maxPlayers}")
                
                if (players.isNotEmpty()) {
                    sender.sendMessage("  &7Queued: &f${players.joinToString(", ") { it.name }}")
                }
                sender.sendMessage("")
            }
        }
        
        sender.sendMessage(MessageUtils.createSeparator())
    }
    
    private fun handleQueueStats(sender: CommandSender) {
        val queueStats = plugin.queueManager.getQueueStats()
        
        sender.sendMessage(MessageUtils.createSeparator())
        sender.sendMessage(MessageUtils.centerMessage("&6&lQueue Statistics"))
        sender.sendMessage("")
        
        if (queueStats.isEmpty()) {
            sender.sendMessage("&cNo queue statistics available")
        } else {
            queueStats.forEach { stats ->
                sender.sendMessage("&e${stats.queueType} Queue:")
                sender.sendMessage("  &7Current Size: &f${stats.currentSize}")
                sender.sendMessage("  &7Average Wait: &f${MessageUtils.formatDuration(stats.averageWaitTime)}")
                sender.sendMessage("  &7Longest Wait: &f${MessageUtils.formatDuration(stats.longestWaitTime)}")
                sender.sendMessage("")
            }
        }
        
        sender.sendMessage(MessageUtils.createSeparator())
    }
    
    private fun handleQueueClear(sender: CommandSender, args: Array<out String>) {
        if (args.size < 2) {
            sender.sendMessage("&cUsage: /queue clear <queue_type>")
            return
        }
        
        val queueType = args[1]
        val queue = plugin.queueManager.getQueue(queueType)
        
        if (queue == null) {
            sender.sendMessage("&cQueue '$queueType' not found")
            return
        }
        
        val queueSize = queue.getQueueSize()
        queue.clear()
        
        sender.sendMessage("&aCleared $queueSize players from the $queueType queue")
    }
    
    private fun handleQueueForce(sender: CommandSender, args: Array<out String>) {
        if (args.size < 2) {
            sender.sendMessage("&cUsage: /queue force <queue_type>")
            return
        }
        
        val queueType = args[1]
        
        if (plugin.queueManager.forceMatchmaking(queueType)) {
            sender.sendMessage("&aForced matchmaking for $queueType queue")
        } else {
            sender.sendMessage("&cCould not force matchmaking for $queueType queue (not enough players or no available arenas)")
        }
    }
    
    private fun showQueueHelp(sender: CommandSender) {
        sender.sendMessage(MessageUtils.createSeparator())
        sender.sendMessage(MessageUtils.centerMessage("&6&lQueue Admin Commands"))
        sender.sendMessage("")
        sender.sendMessage("&e/queue list &7- List all queues and their players")
        sender.sendMessage("&e/queue stats &7- Show queue statistics")
        sender.sendMessage("&e/queue clear <type> &7- Clear a specific queue")
        sender.sendMessage("&e/queue force <type> &7- Force matchmaking for a queue")
        sender.sendMessage("&e/queue help &7- Show this help message")
        sender.sendMessage(MessageUtils.createSeparator())
    }
}