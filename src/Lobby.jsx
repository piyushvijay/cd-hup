import React, { useState } from 'react'

export default function Lobby({ onStartGame }) {
  const [playerCount, setPlayerCount] = useState(2)
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2'])
  const [playerId, setPlayerId] = useState(0)

  const handlePlayerCountChange = (count) => {
    setPlayerCount(count)
    const names = Array.from({ length: count }, (_, i) => `Player ${i + 1}`)
    setPlayerNames(names)
    if (playerId >= count) setPlayerId(0)
  }

  const handleNameChange = (index, name) => {
    const names = [...playerNames]
    names[index] = name
    setPlayerNames(names)
  }

  const handleStart = () => {
    onStartGame({ playerNames, playerId })
  }

  return (
    <div className="lobby">
      <h2>Game Setup</h2>

      <div className="form-group">
        <label htmlFor="playerCount">Number of Players</label>
        <select
          id="playerCount"
          value={playerCount}
          onChange={(e) => handlePlayerCountChange(parseInt(e.target.value))}
        >
          {[2, 3, 4, 5, 6].map((num) => (
            <option key={num} value={num}>
              {num} Players
            </option>
          ))}
        </select>
      </div>

      {playerNames.map((name, index) => (
        <div key={index} className="form-group">
          <label htmlFor={`player-${index}`}>
            Player {index + 1} Name
          </label>
          <input
            id={`player-${index}`}
            type="text"
            value={name}
            onChange={(e) => handleNameChange(index, e.target.value)}
            placeholder={`Player ${index + 1}`}
          />
          <small style={{ display: 'block', marginTop: '5px' }}>
            <input
              type="radio"
              name="playerId"
              value={index}
              checked={playerId === index}
              onChange={() => setPlayerId(index)}
            />
            {' '}{playerId === index ? 'You play as this player' : '🤖 Bot'}
          </small>
        </div>
      ))}

      <button onClick={handleStart} style={{ marginTop: '20px' }}>
        Start Game
      </button>
    </div>
  )
}
