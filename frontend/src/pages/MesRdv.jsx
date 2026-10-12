import { useEffect, useState } from "react";
import { api } from "../api.js";
import { CarteRdv } from "../ui.jsx";

export default function MesRdv({ patient, onTrouver }) {
  const [liste, setListe] = useState([]);
  const [erreur, setErreur] = useState("");

  const charger = () =>
    api
      .rdvPatient(patient.id)
      .then((d) => {
        setListe(d);
        setErreur("");
      })
      .catch(() => setErreur("Impossible de joindre l'API."));

  useEffect(() => {
    if (patient) charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient]);

  if (!patient)
    return (
      <div className="vide">
        <p>Tu n'as pas encore de rendez-vous</p>
        <span>Réserve ta première consultation pour la retrouver ici.</span>
        <div><button className="btn plein" onClick={onTrouver}>Trouver un médecin</button></div>
      </div>
    );

  const annuler = async (id) => {
    if (!window.confirm("Annuler ce rendez-vous ?")) return;
    await api.changerStatut(id, "annule");
    charger();
  };

  return (
    <>
      <h2 className="titre-page">Mes rendez-vous</h2>
      <p className="sous-titre">Connecté en tant que {patient.nom}</p>
      {erreur && <div className="alerte" role="alert">{erreur}</div>}
      {liste.length === 0 && !erreur ? (
        <div className="vide">
          <p>Aucun rendez-vous</p>
          <div><button className="btn plein" onClick={onTrouver}>Trouver un médecin</button></div>
        </div>
      ) : (
        <div className="liste-rdv">
          {liste.map((r) => (
            <CarteRdv key={r.id} rdv={r} vue="patient">
              {(r.statut === "demande" || r.statut === "confirme") && (
                <button className="btn danger petit" onClick={() => annuler(r.id)}>Annuler</button>
              )}
            </CarteRdv>
          ))}
        </div>
      )}
    </>
  );
}
