import "./PostDescription.css";
import { useState } from "react";

const PostDescription = () => {
  // Declaring a state variable that holds an array of strings that will store the pieces (this data structure will follow stack logic).
  const [pieces, setPieces] = useState<string[]>([]);

  // This function is essentially the push operation, adding a new piece to the top (or end) of the array.
  const handleAddPiece = () => {
    setPieces([...pieces, ""]);
  };

  // This function is essentially the pop operation, removing the most recently added piece from the array.
  const handleRemovePiece = () => {
    if (pieces.length > 0) {
      // Essentially, what slice does here is create a shallow copy of a portion of pieces (the portion in this case being the entire array w/o the last element) and returns it as a new array.
      setPieces(pieces.slice(0, pieces.length - 1));
    }
  };

  // This function populates the specific piece within the array that the user chose with the value they inputted.
  const handlePieceChange = (pieceIndex: number, value: string) => {
    const populatedPieces = [...pieces];
    populatedPieces[pieceIndex] = value;
    setPieces(populatedPieces);
  };

  return (
    <div className="post-description-container">
      <label className="post-description-label" htmlFor="post-caption">
        Enter caption:
      </label>
      <textarea
        className="post-caption-input"
        id="post-caption"
        placeholder="Write a caption..."
        maxLength={500} // Limiting the caption length to 500 characters for now.
        rows={4} // Setting the number of rows to four for now.
      ></textarea>
      <div className="add-piece-container">
        <button className="add-piece-button" onClick={handleAddPiece}>
          Add Piece
        </button>
        <label className="details-label">
          <input type="checkbox" className="details-checkbox" />
          Include details about pieces
        </label>
      </div>

      {/* Creating a dynamic list (since pieces can be added or removed) of input fields (accompanied by a remove button) via the map method. */}
      {pieces.map((piece, index) => (
        <div key={index} className="piece-input-container">
          {" "}
          {/* Here, a new piece input field is created and is identified via the key attribute (React prop that helps with tracking items in a list during re-renders). */}
          <input
            className="piece-input-field"
            id={`piece-${index}`} // For certain attribute values that need to embed an expression, a template literal is used (set up via a backtick: ``) accompanied by a ${} when embedding.
            type="text"
            value={piece}
            placeholder={`Enter piece ${index + 1} name...`}
            onChange={(e) => handlePieceChange(index, e.target.value)} // Creating an event handler to handle populating the array with the inputted value.
          />
          
          <button className="remove-piece-button" onClick={handleRemovePiece}>
            -
          </button>
        </div>
      ))}
    </div>
  );
};

export default PostDescription;

// Next to the "Add Piece" button, there will be a check box that says "Include details about pieces".
// In which if checked, the text areas will turn into accordions that can be expanded into more text entries for users to enter details about the piece (such as date acquired, price, materials, dimensions, etc).

// Make sure check box styling is implemented via icons.