package com.supersmashbrawl.game

enum class GameState {
    WAITING,      // Waiting for players to join
    STARTING,     // Countdown phase before game begins
    ACTIVE,       // Game is actively running
    ENDING,       // Game is ending (cleanup phase)
    FINISHED      // Game has completely finished
}