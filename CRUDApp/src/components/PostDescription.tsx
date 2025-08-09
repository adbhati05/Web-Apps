import "./PostDescription.css";

const PostDescription = () => {
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
    </div>
  );
};

export default PostDescription;

// Next step is to include the description, which will first consist of a button labeled "Add Piece".
// When the user clicks on it, a text area will appear below it where the user can then add the piece.
// The user should be able to add multiple pieces.
// Next to the "Add Piece" button, there will be a check box that says "Include details about pieces".
// In which if checked, the text areas will turn into accordions that can be expanded into more text entries for users to enter details about the piece (such as date acquired, price, materials, dimensions, etc).