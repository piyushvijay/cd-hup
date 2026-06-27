import React, { useState } from 'react'
import Lobby from './Lobby'
import Game from './Game'

export default function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [gameConfig, setGameConfig] = useState(null)

  const handleStartGame = (config) => {
    setGameConfig(config)
    setGameStarted(true)
  }

  const handleRestart = () => {
    setGameStarted(false)
    setGameConfig(null)
  }

  return (
    <div className="container">
      <h1>♠ Sevens Card Game ♠</h1>
      {!gameStarted ? (
        <Lobby onStartGame={handleStartGame} />
      ) : (
        <Game config={gameConfig} onRestart={handleRestart} />
      )}
    </div>
  )
}
