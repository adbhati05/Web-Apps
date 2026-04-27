import { Rock } from "../lib/rocks";

interface RockCardProps {
  rock: Rock;
  index: number;
  isActive?: boolean;
}

export default function RockCard({ rock, index, isActive = false }: RockCardProps) {
  const imgPath = `/${rock.origin}/${rock.name}.jpg`;

  return (
    <div className={`rock-card ${isActive ? "active" : ""}`}>
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
          {rock.texture.map((texture) => (
            <span key={texture} className="rock-tag">{texture}</span>
          ))}
        </div>
      </div>
    </div>
  );
}