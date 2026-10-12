import { MODE_DEMO } from "./api.js";

export const STATUTS = {
  demande: { label: "En attente", cls: "attente" },
  confirme: { label: "Confirmé", cls: "ok" },
  termine: { label: "Terminé", cls: "fini" },
  annule: { label: "Annulé", cls: "annule" },
};

const TEINTES = {
  Cardiologue: "#f4c7c0",
  Généraliste: "#cfe8dc",
  Dermatologue: "#f6dfb4",
  Pédiatre: "#c9dcf3",
  Psychologue: "#dccdf0",
  Ophtalmologue: "#c7e6ec",
  Gynécologue: "#f3cddd",
  Dentiste: "#dfe6c0",
};

export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const dateLongue = (texte) =>
  new Date(`${texte}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export function Avatar({ nom, specialite, taille = 56 }) {
  const mots = nom.replace(/^Dr\.?\s*/i, "").split(" ");
  const initiales = (mots[0][0] + (mots[mots.length - 1][0] || "")).toUpperCase();
  return (
    <div
      className="avatar"
      style={{
        width: taille,
        height: taille,
        fontSize: taille * 0.36,
        background: TEINTES[specialite] || "#dde3df",
      }}
      aria-hidden="true"
    >
      {initiales}
    </div>
  );
}

export function peutRejoindre(rdv) {
  if (rdv.mode !== "en_ligne" || rdv.statut !== "confirme") return false;
  if (MODE_DEMO) return true;
  const debut = new Date(`${rdv.date}T${rdv.heure}:00`).getTime();
  const maintenant = Date.now();
  return maintenant >= debut - 10 * 60000 && maintenant <= debut + 60 * 60000;
}

export function BoutonVisio({ rdv }) {
  if (rdv.mode !== "en_ligne" || rdv.statut === "annule" || rdv.statut === "termine") return null;
  if (rdv.statut === "demande")
    return <span className="note-visio">Le lien de visite sera disponible après confirmation.</span>;
  if (!peutRejoindre(rdv))
    return <span className="note-visio">Visite disponible 10 minutes avant {rdv.heure}.</span>;
  return (
    <a className="btn visio pulse" href={rdv.lien_visio} target="_blank" rel="noopener noreferrer">
      Rejoindre la visite
    </a>
  );
}

// Carte d'un rendez-vous, utilisée côté patient et côté médecin
export function CarteRdv({ rdv, vue, children }) {
  const s = STATUTS[rdv.statut];
  const jour = new Date(`${rdv.date}T00:00:00`);
  return (
    <article className={`rdv ${rdv.statut === "annule" ? "inactif" : ""}`}>
      <div className="rdv-date" aria-label={`${dateLongue(rdv.date)} à ${rdv.heure}`}>
        <span className="mois">{jour.toLocaleDateString("fr-FR", { month: "short" })}</span>
        <span className="jour">{jour.getDate()}</span>
        <span className="heure">{rdv.heure}</span>
      </div>
      <div className="rdv-corps">
        <h3>{vue === "patient" ? rdv.medecin_nom : rdv.patient_nom}</h3>
        <p className="sous">
          {vue === "patient"
            ? rdv.specialite
            : rdv.patient_telephone || "Téléphone non renseigné"}
          {rdv.motif ? ` · ${rdv.motif}` : ""}
        </p>
        <div className="etiquettes">
          <span className={`badge ${rdv.mode === "en_ligne" ? "visio-badge" : "cabinet-badge"}`}>
            {rdv.mode === "en_ligne" ? "Visite en ligne" : "Au cabinet"}
          </span>
          <span className={`badge ${s.cls}`}>{s.label}</span>
        </div>
        <div className="rdv-actions">
          <BoutonVisio rdv={rdv} />
          {children}
        </div>
      </div>
    </article>
  );
}
