import "./PostDescription.css";
import { useState, useEffect } from "react";
import { BsSquare, BsCheckSquare, BsDashCircle } from "react-icons/bs";
import { postService } from "../services/post.service";
import { authService } from "../services/auth.service";
import type { UserInfo } from "../types";

interface PostDescriptionProps {
  imagePreview: string | null;
  onSuccess: () => void;
  onError: (error: string | null) => void;
}

const PostDescription = ({ imagePreview, onSuccess, onError }: PostDescriptionProps) => {
  // Setting up states that will be used to hold information inputted by user for caption, pieces, and piece details (price, size, materials, date acquired). Also setting up a state to hold user info (which will be fetched on mount) and a loading state for when the post is being created.
  // Details are optional, hence the detailsEnabled state to track whether the user has chosen to enter details or not.
  const [caption, setCaption] = useState<string>("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pieces, setPieces] = useState<string[]>([]);
  const [piecesDetails, setPiecesDetails] = useState<string[][]>([]);
  const [detailsEnabled, setDetailsEnabled] = useState<boolean>(false);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const user = await authService.getCurrentUser();
      setUserInfo(user);
    };
    fetchUser();
  }, []);

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

  // This function will take all the data entered by the user and leverage postService's functions to register that data into the database and storage bucket.
  const handleCreatePost = async () => {
    // Basic error handling ensuring user is authenticated, a photo has been selected, and a caption has been entered before allowing the user to create a post.
    if (!userInfo) {
      onError("You must be logged in to create a post.");
      return;
    }

    if (!imagePreview) {
      onError("Please select a photo for your post.");
      return;
    }

    if (!caption.trim()) {
      onError("Please enter a caption for your post.");
      return;
    }

    setLoading(true);
    onError(null);

    // Setting up a const that will hold the pieces info in the format that postService.createPost expects (an array of objects with name, price, size, materials, date acquired properties). 
    // This is generated by mapping over the pieces array and using the current index to access the corresponding details array for each piece in piecesDetails. Default state is just an array with the piece name and 4 empty strings for its details.
    const piecesInfo = pieces.map((piece, index) => {
      const details = piecesDetails[index] || ["", "", "", ""];
      return {
        name: piece,
        price: details[0],
        size: details[1],
        materials: details[2],
        dateAcquired: details[3],
      };
    });

    // Leveraging createPost from postService, but doing so in a try-catch block to handle any errors that might arise during post creation.
    try {
      const post = await postService.createPost(
        caption,
        piecesInfo,
        imagePreview, // postService.createPost expects a URL
        userInfo
      );
      console.log("Post created successfully:", post);

      // Reset form on success, throw an error otherwise
      setCaption("");
      setPieces([]);
      setPiecesDetails([]);
      setDetailsEnabled(false);
      onSuccess();
      alert("Post created successfully!");
    } catch (err: any) {
      console.error("Error creating post:", err);
      onError(err.message || "Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
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
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
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

            <BsDashCircle className="remove-piece-button" onClick={handleRemovePiece} />
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
        <button
          className="create-post-button"
          onClick={handleCreatePost} // Invoking the function above when the button is clicked
          disabled={loading} // Set up loading state so that the button is disabled while the post is being created
        >
          {loading ? "Creating..." : "Create Post"}
        </button>
        <hr className="post-description-line" />
      </div>
    </div>
  );
};

export default PostDescription;
