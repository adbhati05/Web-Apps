import { Rock } from "../lib/rocks";

interface RockCardProps {
  rock: Rock;
  index: number;
}

export default function RockCard({ rock, index }: RockCardProps) {
  const imgPath = `/${rock.origin}/${rock.name}.jpg`;

  return (
    <div className="rock-card">
      <div className="rock-image-container">
        <img
          src={imgPath}
          alt={rock.name}
          className="rock-image"
          loading="lazy"
        />
        <div className="rock-image-overlay" />
        <div className="rock-composition-badge">{rock.composition}</div>
      </div>
      <div className="rock-content">
        <h3 className="rock-name">{rock.name}</h3>
        {rock.description ? (
            <p className="rock-description">{rock.description}</p>
        ) : (
            <p className="rock-description" style={{ opacity: 0.5 }}>No description provided yet.</p>
        )}
        <div className="rock-tags">
          <span className="rock-tag">{rock.origin}</span>
          <span className="rock-tag">{rock.composition}</span>
          {rock.texture && <span className="rock-tag">{rock.texture}</span>}
        </div>
      </div>
    </div>
  );
}