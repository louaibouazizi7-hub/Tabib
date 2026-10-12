import { useEffect, useState } from "react";
import { api } from "../api.js";
import { CarteRdv } from "../ui.jsx";

export default function EspaceMedecin() {
  const [medecins, setMedecins] = useState([]);
  const [id, setId] = useState("");
  const [liste, setListe] = useState([]);
  const [stats, setStats] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api
      .medecins()
      .then((d) => {
        setMedecins(d);
        if (d.length) setId(d[0].id);
      })
      .catch(() => setErreur("Impossible de joindre l'API."));
  }, []);

  const charger = async () => {
    if (!id) return;
    const [r, s] = await Promise.all([api.rdvMedecin(id), api.stats(id)]);
    setListe(r);
    setStats(s);
  };

  useEffect(() => {
    charger().catch(() => setErreur("Impossible de joindre l'API."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const changer = async (rdvId, statut) => {
    await api.changerStatut(rdvId, statut);
    charger();
  };

  return (
    <>
      <div className="entete-page">
        <div>
          <h2 className="titre-page">Espace médecin</h2>
          <p className="sous-titre">Version démo : choisis un médecin pour voir son agenda.</p>
        </div>
        <select className="champ choix-medecin" value={id} onChange={(e) => setId(e.target.value)} aria-label="Médecin">
          {medecins.map((m) => (
            <option key={m.id} value={m.id}>{m.nom} · {m.specialite}</option>
          ))}
        </select>
      </div>

      {erreur && <div className="alerte" role="alert">{erreur}</div>}

      {stats && (
        <section className="stats" aria-label="Statistiques">
          <div className="stat"><span className="chiffre">{stats.aujourdhui}</span><span className="legende">rendez-vous aujourd'hui</span></div>
          <div className="stat"><span className="chiffre">{stats.a_venir}</span><span className="legende">à venir</span></div>
          <div className="stat attention"><span className="chiffre">{stats.a_confirmer}</span><span className="legende">à confirmer</span></div>
          <div className="stat visio-stat"><span className="chiffre">{stats.en_ligne}</span><span className="legende">visites en ligne à venir</span></div>
        </section>
      )}

      {liste.length === 0 ? (
        <div className="vide">
          <p>Aucun rendez-vous pour ce médecin</p>
          <span>Réserve un créneau depuis l'onglet « Trouver un médecin » pour le voir apparaître ici.</span>
        </div>
      ) : (
        <div className="liste-rdv">
          {liste.map((r) => (
            <CarteRdv key={r.id} rdv={r} vue="medecin">
              {r.statut === "demande" && (
                <>
                  <button className="btn plein petit" onClick={() => changer(r.id, "confirme")}>Confirmer</button>
                  <button className="btn danger petit" onClick={() => changer(r.id, "annule")}>Refuser</button>
                </>
              )}
              {r.statut === "confirme" && (
                <>
                  <button className="btn contour petit" onClick={() => changer(r.id, "termine")}>Marquer comme terminé</button>
                  <button className="btn danger petit" onClick={() => changer(r.id, "annule")}>Annuler</button>
                </>
              )}
            </CarteRdv>
          ))}
        </div>
      )}
    </>
  );
}
