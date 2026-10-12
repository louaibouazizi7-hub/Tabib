import { useState } from "react";
import Accueil from "./pages/Accueil.jsx";
import Reserver from "./pages/Reserver.jsx";
import MesRdv from "./pages/MesRdv.jsx";
import EspaceMedecin from "./pages/EspaceMedecin.jsx";

const CLE = "tabib_patient";

function lirePatient() {
  try {
    return JSON.parse(localStorage.getItem(CLE));
  } catch {
    return null;
  }
}

export default function App() {
  const [vue, setVue] = useState("accueil");
  const [medecin, setMedecin] = useState(null);
  const [patient, setPatient] = useState(lirePatient);

  const aller = (v) => {
    setVue(v);
    window.scrollTo({ top: 0 });
  };

  const enregistrer = (p) => {
    setPatient(p);
    try {
      localStorage.setItem(CLE, JSON.stringify(p));
    } catch {
      /* stockage indisponible */
    }
  };

  const deconnecter = () => {
    setPatient(null);
    try {
      localStorage.removeItem(CLE);
    } catch {
      /* stockage indisponible */
    }
    aller("accueil");
  };

  const choisir = (m) => {
    setMedecin(m);
    aller("reserver");
  };

  const onglets = [
    ["accueil", "Trouver un médecin"],
    ["rdv", "Mes rendez-vous"],
    ["medecin", "Espace médecin"],
  ];
  const actif = vue === "reserver" ? "accueil" : vue;

  return (
    <>
      <header className="nav">
        <div className="nav-int">
          <button className="marque" onClick={() => aller("accueil")} aria-label="Tabib, accueil">
            <span className="croix" aria-hidden="true" />
            Tabib
          </button>
          <nav aria-label="Navigation principale">
            {onglets.map(([cle, label]) => (
              <button key={cle} className="onglet" aria-current={actif === cle ? "page" : undefined} onClick={() => aller(cle)}>
                {label}
              </button>
            ))}
          </nav>
          {patient && (
            <button className="patient-puce" onClick={deconnecter} title="Se déconnecter">
              {patient.nom.split(" ")[0]} · quitter
            </button>
          )}
        </div>
      </header>

      <main className="page" key={vue}>
        {vue === "accueil" && <Accueil onChoisir={choisir} />}
        {vue === "reserver" && medecin && (
          <Reserver
            medecin={medecin}
            patient={patient}
            onPatient={enregistrer}
            onVoirRdv={() => aller("rdv")}
            onRetour={() => aller("accueil")}
          />
        )}
        {vue === "rdv" && <MesRdv patient={patient} onTrouver={() => aller("accueil")} />}
        {vue === "medecin" && <EspaceMedecin />}
      </main>
    </>
  );
}
