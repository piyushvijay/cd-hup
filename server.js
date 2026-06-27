import express from 'express'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Game } from './src/gameLogic.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 3001

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// Serve static files from dist
app.use(express.static(join(__dirname, 'dist')))

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'), { dotfiles: 'deny' }, (err) => {
    if (err && err.code === 'ENOENT') {
      res.status(404).send('Not found — run `npm run build` first, or use `npm run dev`')
    }
  })
})

const games = new Map()      // gameId -> Game
const humanPlayers = new Map() // gameId -> Set of human playerIds
const connections = new Map() // ws -> { gameId, playerId }

function getConn(ws) {
  return connections.get(ws) || null
}

// Schedule a bot move if the current player is not human
function scheduleBotMove(gameId) {
  const game = games.get(gameId)
  if (!game || game.gameOver) return

  const humans = humanPlayers.get(gameId) || new Set()
  if (humans.has(game.currentPlayerIndex)) return // human's turn

  // Small delay so the moves feel natural and don't stack-overflow
  setTimeout(() => {
    const g = games.get(gameId)
    if (!g || g.gameOver) return
    if (humans.has(g.currentPlayerIndex)) return

    const player = g.getCurrentPlayer()
    const playable = player.hand.filter(c => g.canPlayCard(c))

    if (playable.length > 0) {
      // Pick a random playable card so bot play varies
      const card = playable[Math.floor(Math.random() * playable.length)]
      g.removeCardFromHand(g.currentPlayerIndex, card)
      g.playCard(card)

      if (g.checkWin()) {
        broadcastAll(gameId, g, { type: 'gameOver', winner: g.winner, winnerName: g.players[g.winner].name })
        return
      }

      g.nextTurn()
      broadcastAll(gameId, g, { type: 'turnChanged' })
    } else {
      g.nextTurn()
      broadcastAll(gameId, g, { type: 'playerPassed' })
    }

    // Chain: keep going while next player is also a bot
    scheduleBotMove(gameId)
  }, 600)
}

function broadcastAll(gameId, game, extraFields = {}) {
  const gameState = game.getGameState()
  wss.clients.forEach((client) => {
    const conn = connections.get(client)
    if (conn && conn.gameId === gameId) {
      client.send(JSON.stringify({
        gameState,
        playerHand: game.getPlayerHand(conn.playerId),
        ...extraFields
      }))
    }
  })
}

wss.on('connection', (ws) => {
  console.log('Client connected')

  ws.on('message', (data) => {
    let msg
    try {
      msg = JSON.parse(data.toString())
    } catch {
      return
    }

    if (msg.type === 'join') {
      const gameId = msg.gameId || 'default'
      let game = games.get(gameId)

      if (!game) {
        game = new Game(msg.players || ['Player 1', 'Player 2'])
        games.set(gameId, game)
      }

      const playerId = typeof msg.playerId === 'number' ? msg.playerId : 0
      connections.set(ws, { gameId, playerId })

      // Register this player as a human
      if (!humanPlayers.has(gameId)) humanPlayers.set(gameId, new Set())
      humanPlayers.get(gameId).add(playerId)

      ws.send(JSON.stringify({
        type: 'gameState',
        gameState: game.getGameState(),
        playerHand: game.getPlayerHand(playerId)
      }))

      // If the starting player is a bot, kick off their turn
      scheduleBotMove(gameId)
    }

    if (msg.type === 'playCard') {
      const conn = getConn(ws)
      if (!conn) return
      const { gameId, playerId } = conn
      const game = games.get(gameId)
      if (!game || game.gameOver) return
      if (game.currentPlayerIndex !== playerId) return

      const card = msg.card
      if (!game.canPlayCard(card)) return
      if (!game.removeCardFromHand(playerId, card)) return

      game.playCard(card)
      const won = game.checkWin()

      if (won) {
        broadcastAll(gameId, game, { type: 'gameOver', winner: game.winner, winnerName: game.players[game.winner].name })
      } else {
        game.nextTurn()
        broadcastAll(gameId, game, { type: 'turnChanged' })
        scheduleBotMove(gameId)
      }
    }

    if (msg.type === 'pass') {
      const conn = getConn(ws)
      if (!conn) return
      const { gameId, playerId } = conn
      const game = games.get(gameId)
      if (!game || game.gameOver) return
      if (game.currentPlayerIndex !== playerId) return

      // Validate: cannot pass if you have a playable card
      const currentPlayer = game.getCurrentPlayer()
      const hasPlayable = currentPlayer.hand.some(c => game.canPlayCard(c))
      if (hasPlayable) return

      game.nextTurn()
      broadcastAll(gameId, game, { type: 'playerPassed' })
      scheduleBotMove(gameId)
    }

    if (msg.type === 'restart') {
      const conn = getConn(ws)
      if (!conn) return
      const { gameId } = conn
      const game = games.get(gameId)
      if (!game) return

      const newGame = new Game(game.players.map(p => p.name))
      games.set(gameId, newGame)

      broadcastAll(gameId, newGame, { type: 'restart' })
      scheduleBotMove(gameId)
    }
  })

  ws.on('close', () => {
    const conn = connections.get(ws)
    if (conn) {
      const { gameId, playerId } = conn
      const humans = humanPlayers.get(gameId)
      if (humans) humans.delete(playerId)
    }
    connections.delete(ws)
  })
})

server.listen(PORT, () => {
  console.log(`Server listening on ws://localhost:${PORT}`)
})
