import {
    compositions,
    textures
} from "../lib/rocks";

export default function FactsSection() {
    return (
        <section className="facts-section">
            <div className="facts-grid">
                <div className="facts-column">
                    <h2 className="fact-title">Compositions</h2>
                    {compositions.map((composition) => (
                        <div key={composition.composition} className="fact-card">
                            <h3 className="fact-name">{composition.composition[0].toUpperCase() + composition.composition.slice(1)}</h3>
                            <p className="fact-description">{composition.description}</p>
                        </div>
                    ))}
                </div>

                <div className="facts-column">
                    <h2 className="fact-title">Textures</h2>
                    {textures.map((texture) => (
                        <div key={texture.texture} className="fact-card">
                            <h3 className="fact-name">{texture.texture[0].toUpperCase() + texture.texture.slice(1)}</h3>
                            <p className="fact-description">{texture.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}