export const API = "http://localhost:8000";

// true : le bouton « Rejoindre la visite » est actif dès que le médecin a confirmé (pratique pour la démo).
// false : il ne s'active que 10 minutes avant l'heure du rendez-vous (comportement réel).
export const MODE_DEMO = true;

async function appel(chemin, { method = "GET", corps } = {}) {
  const res = await fetch(`${API}${chemin}`, {
    method,
    headers: corps ? { "Content-Type": "application/json" } : undefined,
    body: corps ? JSON.stringify(corps) : undefined,
  });
  if (!res.ok) {
    let message = "Une erreur est survenue. Vérifie les informations saisies.";
    try {
      const d = await res.json();
      if (typeof d.detail === "string") message = d.detail;
    } catch {
      /* réponse sans JSON */
    }
    throw new Error(message);
  }
  return res.json();
}

const sansVides = (obj) =>
  new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== "" && v != null));

export const api = {
  filtres: () => appel("/filtres"),
  medecins: (params = {}) => appel(`/medecins?${sansVides(params)}`),
  creneaux: (id, date) => appel(`/medecins/${id}/creneaux?date=${date}`),
  inscrire: (patient) => appel("/patients", { method: "POST", corps: patient }),
  reserver: (rdv) => appel("/rendez-vous", { method: "POST", corps: rdv }),
  rdvPatient: (id) => appel(`/rendez-vous?patient_id=${id}`),
  rdvMedecin: (id) => appel(`/rendez-vous?medecin_id=${id}`),
  changerStatut: (id, statut) =>
    appel(`/rendez-vous/${id}/statut`, { method: "PUT", corps: { statut } }),
  stats: (id) => appel(`/stats?medecin_id=${id}`),
};
