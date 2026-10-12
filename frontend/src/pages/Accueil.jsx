import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Avatar } from "../ui.jsx";

export default function Accueil({ onChoisir }) {
  const [filtres, setFiltres] = useState({ specialites: [], villes: [] });
  const [q, setQ] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [ville, setVille] = useState("");
  const [enLigne, setEnLigne] = useState(false);
  const [liste, setListe] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.filtres().then(setFiltres).catch(() => {});
  }, []);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    api
      .medecins({ q, specialite, ville, en_ligne: enLigne ? "true" : "" })
      .then((d) => {
        if (annule) return;
        setListe(d);
        setErreur("");
      })
      .catch(() => {
        if (!annule)
          setErreur("Impossible de joindre l'API. Vérifie que le backend tourne sur le port 8000.");
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, [q, specialite, ville, enLigne]);

  return (
    <>
      <section className="hero">
        <h1>Le bon médecin, au cabinet ou depuis chez vous.</h1>
        <p>
          Réservez un créneau en quelques clics. Les visites en ligne se font en vidéo, sans rien
          installer.
        </p>
        <div className="recherche">
          <input
            className="champ"
            type="search"
            placeholder="Nom ou spécialité"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Rechercher un médecin"
          />
          <select className="champ" value={specialite} onChange={(e) => setSpecialite(e.target.value)} aria-label="Spécialité">
            <option value="">Toutes les spécialités</option>
            {filtres.specialites.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className="champ" value={ville} onChange={(e) => setVille(e.target.value)} aria-label="Ville">
            <option value="">Toutes les villes</option>
            {filtres.villes.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <label className="coche">
            <input type="checkbox" checked={enLigne} onChange={(e) => setEnLigne(e.target.checked)} />
            Visite en ligne
          </label>
        </div>
      </section>

      {erreur && <div className="alerte" role="alert">{erreur}</div>}

      {!erreur && !chargement && liste.length === 0 && (
        <div className="vide">
          <p>Aucun médecin ne correspond</p>
          <span>Essaie d'enlever un filtre.</span>
        </div>
      )}

      <div className="grille-medecins">
        {liste.map((m, i) => (
          <article className="carte-medecin" key={m.id} style={{ "--i": Math.min(i, 8) }}>
            <div className="entete">
              <Avatar nom={m.nom} specialite={m.specialite} />
              <div>
                <h3>{m.nom}</h3>
                <p className="sous">{m.specialite} · {m.ville}</p>
              </div>
            </div>
            <div className="infos">
              <span className="note">★ {m.note.toFixed(1)}</span>
              <span>{m.experience} ans d'expérience</span>
              <span className="tarif">{m.tarif} DT</span>
            </div>
            <div className="etiquettes">
              {m.en_ligne ? (
                <span className="badge visio-badge">Visite en ligne</span>
              ) : (
                <span className="badge cabinet-badge">Au cabinet uniquement</span>
              )}
            </div>
            <button className="btn plein" onClick={() => onChoisir(m)}>
              Voir les disponibilités
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
