package com.supersmashbrawl.command

import com.supersmashbrawl.SuperSmashBrawlPlugin
import com.supersmashbrawl.command.impl.*

class CommandManager(private val plugin: SuperSmashBrawlPlugin) {
    
    fun registerCommands() {
        // Register main command
        plugin.getCommand("supersmashbrawl")?.setExecutor(MainCommand(plugin))
        plugin.getCommand("supersmashbrawl")?.tabCompleter = MainCommand(plugin)
        
        // Register queue command
        plugin.getCommand("1v1")?.setExecutor(OneVOneCommand(plugin))
        plugin.getCommand("1v1")?.tabCompleter = OneVOneCommand(plugin)
        
        // Register admin commands
        plugin.getCommand("queue")?.setExecutor(QueueCommand(plugin))
        plugin.getCommand("queue")?.tabCompleter = QueueCommand(plugin)
        
        plugin.getCommand("arena")?.setExecutor(ArenaCommand(plugin))
        plugin.getCommand("arena")?.tabCompleter = ArenaCommand(plugin)
        
        plugin.logger.info("Registered commands")
    }
}