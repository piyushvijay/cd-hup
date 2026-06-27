import React, { useState, useEffect, useRef, useCallback } from 'react'
import Card from './Card'

export default function Game({ config, onRestart }) {
  const [gameState, setGameState] = useState(null)
  const [hand, setHand] = useState([])
  const [connected, setConnected] = useState(false)
  const [gameOverState, setGameOverState] = useState(null) // { winnerName }
  const wsRef = useRef(null)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws`

    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      setConnected(true)
      wsRef.current.send(JSON.stringify({
        type: 'join',
        gameId: 'default',
        playerId: config.playerId,
        players: config.playerNames
      }))
    }

    wsRef.current.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      // Every server message carries the latest gameState and this player's hand
      if (msg.gameState) setGameState(msg.gameState)
      if (msg.playerHand !== undefined) setHand(msg.playerHand)

      if (msg.type === 'gameOver') {
        setGameOverState({ winnerName: msg.winnerName })
      }

      if (msg.type === 'restart') {
        // Server sent fresh state — clear game over so the new game is shown
        setGameOverState(null)
      }
    }

    wsRef.current.onerror = () => setConnected(false)
    wsRef.current.onclose = () => setConnected(false)

    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [config])

  const canPlayCard = useCallback((card) => {
    if (!gameState) return false

    const getRankValue = (rank) => {
      const ranks = { A: 1, J: 11, Q: 12, K: 13 }
      return ranks[rank] ?? parseInt(rank, 10)
    }

    const rank = getRankValue(card.rank)
    const suit = card.suit

    if (rank === 7) return true
    if (!gameState.table[suit]) return false

    const suitCards = gameState.table[suit]
    return String(rank - 1) in suitCards || String(rank + 1) in suitCards
  }, [gameState])

  const playCard = (card) => {
    if (!gameState || gameState.currentPlayerIndex !== config.playerId) return
    if (!canPlayCard(card)) return
    wsRef.current.send(JSON.stringify({ type: 'playCard', card }))
  }

  const pass = () => {
    if (!gameState || gameState.currentPlayerIndex !== config.playerId) return
    wsRef.current.send(JSON.stringify({ type: 'pass' }))
  }

  const requestRestart = () => {
    wsRef.current.send(JSON.stringify({ type: 'restart' }))
  }

  if (!connected || !gameState) {
    return <div className="status-message">Connecting to game...</div>
  }

  if (gameOverState) {
    return (
      <div className="game-over">
        <h2>Game Over!</h2>
        <p>🎉 {gameOverState.winnerName} wins!</p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button className="restart-btn" onClick={requestRestart}>
            Play Again (same players)
          </button>
          <button className="restart-btn" onClick={onRestart} style={{ background: '#666' }}>
            Change Players
          </button>
        </div>
      </div>
    )
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isYourTurn = gameState.currentPlayerIndex === config.playerId
  const hasPlayable = hand.some(card => canPlayCard(card))

  // Suits in display order
  const SUIT_ORDER = ['♠', '♥', '♦', '♣']
  const tableSuits = SUIT_ORDER.filter(s => gameState.table[s])

  return (
    <div className="game-container">
      {isYourTurn && (
        <div className="status-message">
          {hasPlayable ? 'It\'s your turn! Click a highlighted card to play.' : 'No playable cards — you must pass.'}
        </div>
      )}

      <div className="table-area">
        <div className="table-title">
          Table — {currentPlayer.name}'s turn
        </div>
        <div className="card-table">
          {tableSuits.length === 0 ? (
            <div className="empty-hand" style={{ gridColumn: '1 / -1' }}>
              Waiting for the first 7 to be played…
            </div>
          ) : (
            tableSuits.map((suit) => {
              const suitCards = gameState.table[suit]
              const sortedCards = Object.entries(suitCards)
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([, card]) => card)

              return (
                <div key={suit} className="table-suit">
                  <div className="suit-label">{suit}</div>
                  <div className="suit-cards">
                    {sortedCards.map((card) => (
                      <Card key={`${card.rank}${card.suit}`} card={card} small />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="players-section">
        <div className="players-title">Players</div>
        <div className="players-list">
          {gameState.players.map((player) => (
            <div
              key={player.id}
              className={`player-card ${
                gameState.currentPlayerIndex === player.id ? 'current' : ''
              }`}
            >
              <div className="player-name">
                {player.name}
                {player.id === config.playerId ? ' (You)' : ' 🤖'}
              </div>
              <div className="player-hand-size">
                {player.handSize} {player.handSize === 1 ? 'card' : 'cards'}
              </div>
              {player.passed && <div className="player-status">Passed</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="hand-area">
        <div className="hand-title">Your Hand ({hand.length} cards)</div>
        {hand.length === 0 ? (
          <div className="empty-hand">No cards — waiting for game result…</div>
        ) : (
          <>
            <div className="cards-container">
              {hand.map((card) => {
                const playable = canPlayCard(card) && isYourTurn
                return (
                  <Card
                    key={`${card.rank}${card.suit}`}
                    card={card}
                    playable={playable}
                    onClick={isYourTurn ? () => playCard(card) : undefined}
                  />
                )
              })}
            </div>
            <div className="action-buttons">
              <button
                className="pass-btn"
                onClick={pass}
                disabled={!isYourTurn || hasPlayable}
                title={hasPlayable ? 'You have a playable card — you cannot pass' : ''}
              >
                Pass
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
