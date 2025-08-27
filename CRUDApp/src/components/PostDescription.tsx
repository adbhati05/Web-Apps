import "./PostDescription.css";
import { useState } from "react";
import { BsSquare, BsCheckSquare } from "react-icons/bs";

const PostDescription = () => {
  // Declaring a state variable that holds an array of strings that will store the pieces (this data structure will follow stack logic).
  const [pieces, setPieces] = useState<string[]>([]);

  // This state variable is set up so that each array within this data structure will contain the details for each piece (each detail being an element).
  const [piecesDetails, setPiecesDetails] = useState<string[][]>([]);

  // This boolean state variable will be used to check if the "Add Piece" button has been clicked, if so, then the details input fields will be shown.
  const [detailsEnabled, setDetailsEnabled] = useState<boolean>(false);

  // This function is essentially the push operation, adding a new piece to the top (or end) of the array. If the user chooses to add details for each piece, the corresponding details array will be initialized.
  const handleAddPiece = () => {
    if (pieces.length < 8) {
      setPieces([...pieces, ""]);

      if (detailsEnabled) {
        setPiecesDetails([...piecesDetails, ["", "", "", ""]]); // Initialize with empty strings for: price, size, materials, date acquired
      }
    }
  };

  // This function is essentially the pop operation, removing the most recently added piece from the array.
  const handleRemovePiece = () => {
    if (pieces.length > 0) {
      // Essentially, what slice does here is create a shallow copy of a portion of pieces (the portion in this case being the entire array w/o the last element) and returns it as a new array.
      setPieces(pieces.slice(0, pieces.length - 1));

      // This ensures that if the user toggled the details checkbox and deleted a piece, that piece's corresponding details are also removed.
      if (detailsEnabled && piecesDetails.length > 0) {
        setPiecesDetails(piecesDetails.slice(0, piecesDetails.length - 1));
      }
    }
  };

  // This function populates the specific piece within the array that the user chose with the value they inputted.
  const handlePieceChange = (pieceIndex: number, value: string) => {
    const populatedPieces = [...pieces];
    populatedPieces[pieceIndex] = value;
    setPieces(populatedPieces);
  };

  // This function will be called when the user toggles the details checkbox.
  const handleDetailsToggle = () => {
    // Accessing the next state of detailsEnabled above to ensure React can properly re-render the page depending on if the user toggles the checkbox or not.
    const nextDetailsEnabledState = !detailsEnabled;
    setDetailsEnabled(nextDetailsEnabledState);

    // Here, if the user chooses to enable details and pieces exist (for each piece that exists) an array of 4 empty strings is generated, populating a larger encompassing array (which will then be passed into setPiecesDetails).
    if (
      nextDetailsEnabledState &&
      pieces.length > 0 &&
      piecesDetails.length === 0
    ) {
      const initialDetails = pieces.map(() => ["", "", "", ""]);
      setPiecesDetails(initialDetails);
    }

    // If the user chooses to disable details, the piecesDetails array is cleared.
    if (!nextDetailsEnabledState) {
      setPiecesDetails([]);
    }
  };

  // Similar to the logic above with handlePieceChange, this function will be called below when the user enters info in each of the detail input fields so that each array in the piecesDetails can be populated.
  const handleDetailsChange = (
    pieceIndex: number,
    detailIndex: number,
    value: string
  ) => {
    const populatedDetails = [...piecesDetails];
    populatedDetails[pieceIndex][detailIndex] = value;
    setPiecesDetails(populatedDetails);
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
        <hr className="post-description-line" />
        <button className="add-piece-button" onClick={handleAddPiece}>
          Add Piece
        </button>
        <label className="details-label" onClick={handleDetailsToggle}>
          {/* Set it up so that the label is clickable and toggles the details (this ensures the bootstrap icon svgs show). */}
          {detailsEnabled ? <BsCheckSquare /> : <BsSquare />}
          Include details about pieces
        </label>
        <hr className="post-description-line" />
      </div>

      {/* Creating a dynamic list (since pieces can be added or removed) of input fields (accompanied by a remove button) via the map method. */}
      {pieces.map((piece, index) => (
        <div key={index} className="piece-container">
          {/* Here, a new piece input field is created and is identified via the key attribute (React prop that helps with tracking items in a list during re-renders). */}
          <div className="piece-input-container">
            <input
              className="piece-input-field"
              id={`piece-${index}`} // For certain attribute values that need to embed an expression, a template literal is used (set up via a backtick: ``) accompanied by a ${} when embedding.
              type="text"
              value={piece} // Ensuring that the current piece in pieces to be the user's input.
              placeholder={`Enter piece ${index + 1} name...`}
              onChange={(e) => handlePieceChange(index, e.target.value)} // Creating an event handler to handle populating the array with the inputted value.
            />

            <button className="remove-piece-button" onClick={handleRemovePiece}>
              -
            </button>
          </div>

          {/* Here 4 detail input fields (price, size, materials, date acquired) are rendered if detailsEnabled is true. */}
          {detailsEnabled && piecesDetails[index] && (
            <div className="details-container">
              <div className="detail-input-container">
                <input
                  className="detail-input-field"
                  type="text"
                  placeholder="Enter price..."
                  value={piecesDetails[index][0] || ""} // Ensuring that the first element in each array of piecesDetail is set to be the value of the price input.
                  onChange={(e) =>
                    handleDetailsChange(index, 0, e.target.value)
                  }
                />
              </div>

              <div className="detail-input-container">
                <input
                  className="detail-input-field"
                  type="text"
                  placeholder="Enter size..."
                  value={piecesDetails[index][1] || ""} // Ensuring that the second element in each array of piecesDetail is set to be the value of the size input.
                  onChange={(e) =>
                    handleDetailsChange(index, 1, e.target.value)
                  }
                />
              </div>

              <div className="detail-input-container">
                <input
                  className="detail-input-field"
                  type="text"
                  placeholder="Enter materials..."
                  value={piecesDetails[index][2] || ""} // Ensuring that the third element in each array of piecesDetail is set to be the value of the materials input.
                  onChange={(e) =>
                    handleDetailsChange(index, 2, e.target.value)
                  }
                />
              </div>

              <div className="detail-input-container">
                <input
                  className="detail-input-field"
                  type="text"
                  placeholder="Enter date acquired... (mm/dd/yyyy)"
                  value={piecesDetails[index][3] || ""} // Ensuring that the fourth element in each array of piecesDetail is set to be the value of the date acquired input.
                  onChange={(e) =>
                    handleDetailsChange(index, 3, e.target.value)
                  }
                />
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="create-post-button-container">
        <hr className="post-description-line" />
        <button className="create-post-button">Create Post</button>
        <hr className="post-description-line" />
      </div>
    </div>
  );
};

export default PostDescription;

// Make sure check box styling is implemented via icons.
// Make sure remove piece button styling is implemented via icons.
// IMPROVE STYLING/LAYOUT FOR PIECE INPUTS AND DETAILS.
