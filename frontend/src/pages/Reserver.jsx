import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Avatar, dateLongue, iso } from "../ui.jsx";

const pyJour = (d) => (d.getDay() + 6) % 7; // lundi = 0, comme côté Python

export default function Reserver({ medecin, patient, onPatient, onVoirRdv, onRetour }) {
  const jours = useMemo(() => {
    const liste = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      liste.push({ date: d, iso: iso(d), dispo: medecin.jours.includes(pyJour(d)) });
    }
    return liste;
  }, [medecin]);

  const [date, setDate] = useState(() => jours.find((j) => j.dispo)?.iso ?? "");
  const [creneaux, setCreneaux] = useState([]);
  const [heure, setHeure] = useState("");
  const [mode, setMode] = useState("cabinet");
  const [motif, setMotif] = useState("");
  const [identite, setIdentite] = useState({ nom: "", email: "", telephone: "" });
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [confirme, setConfirme] = useState(null);

  const chargerCreneaux = () => {
    if (!date) return;
    api.creneaux(medecin.id, date).then(setCreneaux).catch(() => setCreneaux([]));
  };

  useEffect(() => {
    setHeure("");
    chargerCreneaux();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, medecin.id]);

  const changeIdentite = (e) => setIdentite({ ...identite, [e.target.name]: e.target.value });

  const envoyer = async (e) => {
    e.preventDefault();
    setErreur("");
    setEnvoi(true);
    try {
      let p = patient;
      if (!p) {
        p = await api.inscrire(identite);
        onPatient(p);
      }
      const rdv = await api.reserver({
        medecin_id: medecin.id,
        patient_id: p.id,
        date,
        heure,
        mode,
        motif,
      });
      setConfirme(rdv);
    } catch (err) {
      setErreur(err.message);
      chargerCreneaux();
    } finally {
      setEnvoi(false);
    }
  };

  if (confirme) {
    return (
      <div className="confirmation">
        <div className="coche-anim" aria-hidden="true" />
        <h2>Demande envoyée</h2>
        <p>
          {medecin.nom} · {dateLongue(confirme.date)} à {confirme.heure}
          <br />
          {confirme.mode === "en_ligne" ? "Visite en ligne" : "Au cabinet"} · en attente de confirmation
        </p>
        {confirme.mode === "en_ligne" && (
          <p className="aide">
            Quand le médecin aura confirmé, le bouton « Rejoindre la visite » apparaîtra dans « Mes
            rendez-vous ».
          </p>
        )}
        <div className="boutons">
          <button className="btn plein" onClick={onVoirRdv}>Voir mes rendez-vous</button>
          <button className="btn contour" onClick={onRetour}>Retour aux médecins</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button className="lien-retour" onClick={onRetour}>← Retour aux médecins</button>
      <div className="reservation">
        <aside className="fiche-medecin">
          <Avatar nom={medecin.nom} specialite={medecin.specialite} taille={84} />
          <h2>{medecin.nom}</h2>
          <p className="sous">{medecin.specialite} · {medecin.ville}</p>
          <p>{medecin.bio}</p>
          <dl>
            <div><dt>Note</dt><dd>★ {medecin.note.toFixed(1)}</dd></div>
            <div><dt>Expérience</dt><dd>{medecin.experience} ans</dd></div>
            <div><dt>Langues</dt><dd>{medecin.langues.join(", ")}</dd></div>
            <div><dt>Tarif</dt><dd>{medecin.tarif} DT</dd></div>
          </dl>
        </aside>

        <form className="panneau-resa" onSubmit={envoyer}>
          <h3><span className="etape">1</span> Choisis un jour</h3>
          <div className="jours" role="group" aria-label="Jours disponibles">
            {jours.map((j) => (
              <button
                type="button"
                key={j.iso}
                className="jour-puce"
                aria-pressed={date === j.iso}
                disabled={!j.dispo}
                onClick={() => setDate(j.iso)}
              >
                <span>{j.date.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                <strong>{j.date.getDate()}</strong>
              </button>
            ))}
          </div>

          <h3><span className="etape">2</span> Choisis une heure</h3>
          {creneaux.length === 0 ? (
            <p className="aide">Aucun créneau ce jour-là.</p>
          ) : (
            <div className="creneaux" role="group" aria-label="Heures disponibles">
              {creneaux.map((c) => (
                <button
                  type="button"
                  key={c.heure}
                  className="creneau"
                  aria-pressed={heure === c.heure}
                  disabled={!c.libre}
                  onClick={() => setHeure(c.heure)}
                >
                  {c.heure}
                </button>
              ))}
            </div>
          )}

          <h3><span className="etape">3</span> Type de consultation</h3>
          <div className="modes" role="radiogroup" aria-label="Type de consultation">
            <button type="button" role="radio" aria-checked={mode === "cabinet"} className="mode" onClick={() => setMode("cabinet")}>
              <strong>Au cabinet</strong>
              <span>À {medecin.ville}</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "en_ligne"}
              className="mode"
              disabled={!medecin.en_ligne}
              onClick={() => setMode("en_ligne")}
            >
              <strong>En ligne</strong>
              <span>{medecin.en_ligne ? "Visite vidéo" : "Non proposé"}</span>
            </button>
          </div>

          <label className="etiq">
            Motif de la consultation (facultatif)
            <textarea className="champ" rows="2" maxLength={300} value={motif} onChange={(e) => setMotif(e.target.value)} />
          </label>

          {!patient && (
            <>
              <h3><span className="etape">4</span> Tes coordonnées</h3>
              <div className="duo">
                <label className="etiq">
                  Nom complet
                  <input className="champ" name="nom" value={identite.nom} onChange={changeIdentite} required minLength={2} />
                </label>
                <label className="etiq">
                  Téléphone
                  <input className="champ" name="telephone" value={identite.telephone} onChange={changeIdentite} />
                </label>
              </div>
              <label className="etiq">
                E-mail
                <input className="champ" name="email" type="email" value={identite.email} onChange={changeIdentite} required />
              </label>
            </>
          )}

          {erreur && <p className="erreur-form" role="alert">{erreur}</p>}

          <button className="btn plein grand" type="submit" disabled={!heure || envoi}>
            {envoi ? "Envoi…" : heure ? `Réserver le ${dateLongue(date)} à ${heure}` : "Choisis une heure"}
          </button>
          <p className="aide">Application de démonstration : n'entre pas de vraies informations médicales.</p>
        </form>
      </div>
    </>
  );
}
