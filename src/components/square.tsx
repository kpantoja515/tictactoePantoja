import React from "react";

interface SquareProps {
  value: string | null;
  onSquareClick: () => void;
}

export default function Square({ value, onSquareClick }: SquareProps) {
  return (
    <button className="square" onClick={onSquareClick}>
      <span className="xo">{value}</span>
    </button>
  );
}
