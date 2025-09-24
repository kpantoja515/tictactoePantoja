import { useState, useEffect } from "react";
import "./App.css";
import Snake from "./components/Snake";
import Board from "./components/Board";
import calculateWinner from "./components/calculateWinner";

export default function App() {
  const [history, setHistory] = useState<(string | null)[][]>([
    Array(9).fill(null),
  ]);
  const [currentMove, setCurrentMove] = useState(0);

  // Modal & game result state
  const [showModal, setShowModal] = useState(false);
  const [gameResult, setGameResult] = useState<
    { type: "winner" | "draw"; winner?: string } | null
  >(null);

  const xIsNext = currentMove % 2 === 0;
  const currentSquares = history[currentMove];
  const winner = calculateWinner(currentSquares);
  const isDraw = !winner && currentSquares.every((sq) => sq !== null);

  function handlePlay(nextSquares: (string | null)[]) {
    const nextHistory = [
      ...history.slice(0, currentMove + 1),
      nextSquares,
    ];
    setHistory(nextHistory);
    setCurrentMove(nextHistory.length - 1);
  }

  function jumpTo(nextMove: number) {
    setCurrentMove(nextMove);
  }

  function resetGame() {
    setHistory([Array(9).fill(null)]);
    setCurrentMove(0);
    setShowModal(false);
    setGameResult(null);
  }

  // Watch for winner or draw
  useEffect(() => {
    if (winner) {
      setGameResult({ type: "winner", winner });
      setShowModal(true);
    } else if (isDraw) {
      setGameResult({ type: "draw" });
      setShowModal(true);
    }
  }, [winner, isDraw]);

  const moves = history.map((_, move) => {
    const description = move > 0 ? `Move #${move}` : "Game start";
    return (
      <li key={move}>
        <button
          onClick={() => jumpTo(move)}
          className={`history-btn ${move === currentMove ? "active" : ""}`}
        >
          {description}
        </button>
      </li>
    );
  });

  return (
    <>
      {/* Snake background */}
      <Snake />

      {/* Main Game Container */}
      <div className="app-container">
        <div className="game-wrapper">
          <h1 className="game-title">Tic Tac Toe</h1>

          <div className="game-status">
            {winner ? (
              <span className="winner-text">🎉 {winner} Wins!</span>
            ) : isDraw ? (
              <span className="draw-text">🤝 It's a Draw!</span>
            ) : (
              <span className="next-player">
                Next player:{" "}
                <span className={`player ${xIsNext ? "x" : "o"}`}>
                  {xIsNext ? "X" : "O"}
                </span>
              </span>
            )}
          </div>

          <div className="game-content">
            <div className="game-board">
              <Board
                xIsNext={xIsNext}
                squares={currentSquares}
                onPlay={handlePlay}
              />
            </div>

            <div className="game-info">
              <h3>Game History</h3>
              <ol className="history-list">{moves}</ol>
              <button onClick={resetGame} className="reset-btn">
                🔄 New Game
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Victory/Draw Modal */}
      {showModal && gameResult && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-content">
              {gameResult.type === "winner" ? (
                <>
                  <h2 className="modal-title">🎉 Game Over!</h2>
                  <p className="modal-text">
                    <span
                      className={`winner-name ${gameResult.winner?.toLowerCase()}`}
                    >
                      {gameResult.winner}
                    </span>{" "}
                    wins!
                  </p>
                </>
              ) : (
                <>
                  <h2 className="modal-title">🤝 It's a Draw!</h2>
                  <p className="modal-text">
                    Great game! No one wins this time.
                  </p>
                </>
              )}

              <div className="modal-buttons">
                <button onClick={resetGame} className="play-again-btn">
                  🎮 Play Again
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="continue-btn"
                >
                  📊 View Board
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
