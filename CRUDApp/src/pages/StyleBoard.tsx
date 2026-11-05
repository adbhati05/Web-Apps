import TopBar from "../components/TopBar";
import LeftSideBar from "../components/LeftSideBar";
import FitBoard from "../components/FitBoard";
import ArchiveSideBar from "../components/ArchiveSideBar";
import AddPieceOverlay from "../components/AddPieceOverlay";
import FitFormOverlay from "../components/FitFormOverlay";
import { useState, useEffect } from "react";
import { useUserAuth } from "../auth/UserAuthContext";
import { useAlert } from "../alerts/AlertContext";
import { archiveService } from "../services/archive.service";
import { fitService, getFitLabel } from "../services/fit.service";
import type { ArchivedPiece, Fit, PieceDetail } from "../types";
import "./StyleBoard.css";

// This page is the user's style board: the planned fits in the middle (FitBoard) and their archive of pieces in the right side bar (ArchiveSideBar).
// Pieces get into the archive by favoriting them from posts on the feed or adding your own, and fits are planned from the archive's pieces.
// Both lists are private and come from onSnapshot listeners, so adding, editing, or removing anything shows up here on its own.
const StyleBoard = () => {
  const { userInfo } = useUserAuth();
  const { showAlert } = useAlert();
  const myUid = userInfo?.uid;

  const [archive, setArchive] = useState<ArchivedPiece[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [archiveError, setArchiveError] = useState(false);

  const [fits, setFits] = useState<Fit[]>([]);
  const [fitsLoading, setFitsLoading] = useState(true);
  const [fitsError, setFitsError] = useState(false);

  // Which overlay is open: the add-piece one, or the fit form ("new" for planning a new fit, or the fit being edited).
  const [addPieceOpen, setAddPieceOpen] = useState(false);
  const [fitFormTarget, setFitFormTarget] = useState<Fit | "new" | null>(null);

  // Below 900px only one of the two lists fits next to the nav, so tabs at the top switch between them (see StyleBoard.css). Above that, both always show and the tabs are hidden.
  const [activeTab, setActiveTab] = useState<"fits" | "archive">("fits");

  // Starts both listeners once the user's doc has loaded. The cleanup unsubscribes them when leaving the page, same as the chat listeners.
  useEffect(() => {
    if (!myUid) return;

    const unsubscribeArchive = archiveService.subscribeToArchive(
      myUid,
      (pieces) => {
        setArchive(pieces);
        setArchiveLoading(false);
      },
      (error) => {
        console.error("Failed to load archive:", error);
        setArchiveError(true);
        setArchiveLoading(false);
      }
    );

    const unsubscribeFits = fitService.subscribeToFits(
      myUid,
      (updatedFits) => {
        setFits(updatedFits);
        setFitsLoading(false);
      },
      (error) => {
        console.error("Failed to load fits:", error);
        setFitsError(true);
        setFitsLoading(false);
      }
    );

    return () => {
      unsubscribeArchive();
      unsubscribeFits();
    };
  }, [myUid]);

  // The handlers below are what the overlays call. Each one shows a success alert when it works. When it fails, it shows an error alert and re-throws, so the overlay knows to stay open with the form filled in.
  const handleAddPiece = async (piece: PieceDetail, hasDetails: boolean) => {
    if (!userInfo) return;
    try {
      await archiveService.addOwnPiece(userInfo.uid, userInfo.username, piece, hasDetails);
      showAlert("success", "Added to your archive.");
    } catch (error) {
      console.error("Failed to add piece:", error);
      showAlert("error", "Couldn't add that piece. Try again.");
      throw error;
    }
  };

  const handleRemovePiece = async (piece: ArchivedPiece) => {
    if (!myUid) return;
    try {
      await archiveService.removePiece(myUid, piece.id);
      showAlert("success", `Removed ${piece.name} from your archive.`);
    } catch (error) {
      console.error("Failed to remove piece:", error);
      showAlert("error", "Couldn't remove that piece. Try again.");
    }
  };

  const handleSaveFit = async (name: string, sections: Fit["sections"]) => {
    if (!myUid || !fitFormTarget) return;
    try {
      if (fitFormTarget === "new") {
        await fitService.createFit(myUid, name, sections);
        showAlert("success", "Fit added to your board.");
      } else {
        await fitService.updateFit(myUid, fitFormTarget, name, sections);
        showAlert("success", "Fit updated.");
      }
    } catch (error) {
      console.error("Failed to save fit:", error);
      showAlert("error", "Couldn't save your fit. Try again.");
      throw error;
    }
  };

  const handleDeleteFit = async () => {
    if (!myUid || !fitFormTarget || fitFormTarget === "new") return;
    try {
      await fitService.deleteFit(myUid, fitFormTarget.id);
      showAlert("success", "Fit deleted.");
    } catch (error) {
      console.error("Failed to delete fit:", error);
      showAlert("error", "Couldn't delete your fit. Try again.");
      throw error;
    }
  };

  // What the fit in the form is called without a name: its own spot on the board when editing, or the next spot when planning a new one.
  const editingIndex = fitFormTarget && fitFormTarget !== "new" ? fits.findIndex((fit) => fit.id === fitFormTarget.id) : -1;
  const fitFormLabel = editingIndex >= 0 ? getFitLabel({ ...fits[editingIndex], name: undefined }, editingIndex) : `Fit #${fits.length + 1}`;

  // The Fits/Archive tabs, rendered at the top of both panes (only one pane shows at a time below 900px, and the tabs are hidden above that).
  const tabs = (
    <div className="style-board-tabs" role="tablist">
      <button role="tab" aria-selected={activeTab === "fits"} className={`style-board-tab${activeTab === "fits" ? " style-board-tab-active" : ""}`} onClick={() => setActiveTab("fits")}>
        Fits
      </button>
      <button role="tab" aria-selected={activeTab === "archive"} className={`style-board-tab${activeTab === "archive" ? " style-board-tab-active" : ""}`} onClick={() => setActiveTab("archive")}>
        Archive
      </button>
    </div>
  );

  return (
    <div>
      <TopBar />
      {/* style-board-archive-open tells the CSS which pane the tabs picked, same idea as the chat page's chat-thread-open class. */}
      <div className={`style-board-main-layout${activeTab === "archive" ? " style-board-archive-open" : ""}`}>
        <div className="style-board-left-side-bar">
          <LeftSideBar />
        </div>
        <div className="style-board-container">
          {tabs}
          <FitBoard
            fits={fits}
            loading={fitsLoading || !myUid}
            error={fitsError}
            onAddClick={() => setFitFormTarget("new")}
            onFitClick={(fit) => setFitFormTarget(fit)}
          />
        </div>
        <div className="style-board-right-side-bar">
          {tabs}
          <ArchiveSideBar
            pieces={archive}
            loading={archiveLoading || !myUid}
            error={archiveError}
            onAddClick={() => setAddPieceOpen(true)}
            onRemove={handleRemovePiece}
          />
        </div>
      </div>

      {/* The overlays sit outside the layout box, same as the post overlay, since their backdrops cover the whole viewport. */}
      {addPieceOpen && (
        <AddPieceOverlay onClose={() => setAddPieceOpen(false)} onAdd={handleAddPiece} />
      )}

      {fitFormTarget && (
        <FitFormOverlay
          // key resets the form's drafts when switching straight from one fit to another.
          key={fitFormTarget === "new" ? "new" : fitFormTarget.id}
          archive={archive}
          fit={fitFormTarget === "new" ? undefined : fitFormTarget}
          defaultLabel={fitFormLabel}
          onClose={() => setFitFormTarget(null)}
          onSave={handleSaveFit}
          onDelete={fitFormTarget === "new" ? undefined : handleDeleteFit}
        />
      )}
    </div>
  );
};

export default StyleBoard;
