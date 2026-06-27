// Card deck utilities
export const SUITS = ['♠', '♥', '♦', '♣']
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export function cardValue(card) {
  const ranks = { A: 1, J: 11, Q: 12, K: 13 }
  if (card.rank in ranks) return ranks[card.rank]
  const v = parseInt(card.rank, 10)
  if (isNaN(v)) throw new Error(`Unknown rank: ${card.rank}`)
  return v
}

// Game state
export class Game {
  constructor(playerNames) {
    this.players = playerNames.map((name, id) => ({
      id,
      name,
      hand: [],
      passed: false
    }))
    this.deck = createDeck()
    this.table = {} // { suit: { rankNum: card } }
    this.currentPlayerIndex = 0
    this.gameOver = false
    this.winner = null

    // Deal all 52 cards round-robin
    let i = 0
    while (this.deck.length > 0) {
      this.players[i % this.players.length].hand.push(this.deck.pop())
      i++
    }

    // Find player with 7♣ and make them start
    const starterIndex = this.players.findIndex(p =>
      p.hand.some(c => c.rank === '7' && c.suit === '♣')
    )
    this.currentPlayerIndex = starterIndex >= 0 ? starterIndex : 0
  }

  canPlayCard(card) {
    const rank = cardValue(card)
    const suit = card.suit

    // Sevens can always be played
    if (rank === 7) return true

    // If no 7 has been played for this suit yet, can't play
    if (!this.table[suit]) return false

    const suitCards = this.table[suit]
    return String(rank - 1) in suitCards || String(rank + 1) in suitCards
  }

  playCard(card) {
    const rank = cardValue(card)
    const suit = card.suit

    if (!this.table[suit]) {
      this.table[suit] = {}
    }

    this.table[suit][String(rank)] = card
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex]
  }

  // Returns the next player index who has a playable card, or null if none do
  _findNextPlayable(fromIndex) {
    for (let i = 1; i <= this.players.length; i++) {
      const idx = (fromIndex + i) % this.players.length
      const player = this.players[idx]
      if (player.hand.some(c => this.canPlayCard(c))) {
        return idx
      }
    }
    return null
  }

  nextTurn() {
    const next = this._findNextPlayable(this.currentPlayerIndex)

    // Mark all players with no playable cards as passed
    for (const player of this.players) {
      player.passed = !player.hand.some(c => this.canPlayCard(c))
    }

    if (next !== null) {
      this.currentPlayerIndex = next
      this.players[next].passed = false
    }
    // If next === null, all players are deadlocked — game stays on current player
    // (rare edge case; game is essentially stuck but we don't loop infinitely)
  }

  removeCardFromHand(playerIndex, card) {
    const player = this.players[playerIndex]
    const index = player.hand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit
    )
    if (index >= 0) {
      player.hand.splice(index, 1)
      return true
    }
    return false
  }

  checkWin() {
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].hand.length === 0) {
        this.gameOver = true
        this.winner = i
        return true
      }
    }
    return false
  }

  getGameState() {
    return {
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        handSize: p.hand.length,
        passed: p.passed
      })),
      table: this.table,
      currentPlayerIndex: this.currentPlayerIndex,
      gameOver: this.gameOver,
      winner: this.winner
    }
  }

  getPlayerHand(playerId) {
    return this.players[playerId]?.hand || []
  }
}
