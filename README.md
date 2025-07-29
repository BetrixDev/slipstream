# Super Smash Mobs Brawl

A comprehensive 1v1 minigame system for Minecraft PaperMC 1.21.6 servers.

## Features

- **1v1 Dueling System**: Classic player vs player combat with round-based gameplay
- **Queue Management**: Automatic matchmaking with queue system
- **Arena System**: Flexible arena configuration with boundaries and spawn points
- **Game States**: Proper handling of waiting, starting, active, and ending states
- **Player Management**: Inventory restoration, teleportation, and cleanup
- **Event Handling**: Comprehensive event protection during games
- **Admin Commands**: Full administrative control over queues and arenas
- **Configuration**: Highly configurable messages, game settings, and arena layouts

## Commands

### Player Commands
- `/1v1` - Join the 1v1 queue
- `/1v1 leave` - Leave the 1v1 queue
- `/1v1 status` - Check your queue position
- `/ssb info` - Show plugin information
- `/ssb stats` - Show server statistics

### Admin Commands
- `/ssb reload` - Reload the plugin configuration
- `/queue list` - List all queues and players
- `/queue stats` - Show queue statistics
- `/queue clear <type>` - Clear a specific queue
- `/queue force <type>` - Force matchmaking for a queue
- `/arena list` - List all configured arenas
- `/arena info <name>` - Show detailed arena information
- `/arena create <name>` - Create an arena at your location
- `/arena delete <name>` - Delete an arena
- `/arena reload` - Reload arena configurations

## Permissions

- `supersmashbrawl.play` - Basic permission to use the plugin (default: true)
- `supersmashbrawl.join` - Permission to join game queues (default: true)
- `supersmashbrawl.admin` - Administrative access to all commands (default: op)

## Installation

1. Download the plugin JAR file
2. Place it in your server's `plugins` folder
3. Start or restart your server
4. Configure arenas using `/arena create <name>` command
5. Players can start using `/1v1` to join the queue

## Configuration

### Main Config (`config.yml`)
- Database settings
- Queue configuration
- Game timing and rules
- Performance settings

### Messages (`messages.yml`)
- All player-facing messages
- Color codes and formatting
- Placeholder support

### Arenas (`arenas.yml`)
- Arena definitions
- Spawn points and boundaries
- Spectator locations

### Games (`games.yml`)
- Game-specific settings
- Kit configurations
- Round rules and timings

## Arena Setup

1. Go to your desired arena location
2. Run `/arena create <arena_name>`
3. Edit `arenas.yml` to configure:
   - Additional spawn points
   - Arena boundaries
   - Spectator spawn location
   - Minimum/maximum Y levels

### Example Arena Configuration

```yaml
arenas:
  pvp_arena:
    world: "world"
    center:
      x: 0.0
      y: 64.0
      z: 0.0
    spawnPoints:
      0:
        x: -10.0
        y: 64.0
        z: 0.0
        yaw: 90.0
      1:
        x: 10.0
        y: 64.0
        z: 0.0
        yaw: -90.0
    spectatorSpawn:
      x: 0.0
      y: 74.0
      z: 0.0
    boundary:
      type: "rectangular"
      minX: -20.0
      maxX: 20.0
      minZ: -20.0
      maxZ: 20.0
```

## Game Flow

1. **Queue Phase**: Players join queue using `/1v1`
2. **Matchmaking**: System automatically matches players when arena available
3. **Teleportation**: Players teleported to arena and given kit
4. **Countdown**: Brief countdown before game starts
5. **Rounds**: Best-of-5 round system with brief breaks between rounds
6. **End Game**: Winner announced, players restored and teleported back

## Dependencies

- **PaperMC 1.21.6** or higher
- **Java 21** or higher
- **Kotlin 2.1.0** (bundled)

### Optional Dependencies
- **PlaceholderAPI** - For placeholder support
- **WorldEdit** - For advanced arena creation

## Building

```bash
./gradlew build
```

The compiled JAR will be in `build/libs/`.

## API

The plugin provides a comprehensive API for developers to create additional game modes or integrate with other plugins. Key interfaces include:

- `IMinigame` - Base interface for all minigames
- `AbstractMinigame` - Base implementation with common functionality
- `GameManager` - Manage active games
- `QueueManager` - Handle matchmaking
- `ArenaManager` - Arena management

## Support

- **Version**: 1.0.0-SNAPSHOT
- **Minecraft**: 1.21.6
- **API Version**: 1.21

## License

This project is licensed under the MIT License - see the LICENSE file for details.
