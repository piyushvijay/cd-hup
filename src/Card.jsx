import React from 'react'

const RED_SUITS = ['♥', '♦']

export default function Card({ card, playable, onClick, small }) {
  const isRed = RED_SUITS.includes(card.suit)
  const classes = [
    'card',
    small ? 'card-small' : '',
    playable ? 'playable' : '',
    !small && !playable ? 'not-playable' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      onClick={onClick}
      style={{ color: isRed ? '#d32f2f' : '#111' }}
    >
      <div className="card-rank">{card.rank}</div>
      <div className="card-suit">{card.suit}</div>
    </div>
  )
}
