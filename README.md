# Tabib : consultation de médecins, au cabinet ou en ligne

Application full stack : React (frontend), FastAPI (backend), MongoDB (base de données).
Tous les médecins et patients sont **fictifs** : n'enregistre jamais de vraies informations médicales.

## Structure
```
Tabib/
├── backend/    API REST FastAPI (port 8000)
└── frontend/   Interface React avec Vite (port 5173)
```

## Lancer le projet (Linux / WSL2 Ubuntu)

1. Vérifier que MongoDB tourne : `sudo systemctl status mongod`

2. Backend (terminal 1)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pymongo
python seed.py                         # ajoute 8 médecins fictifs (une seule fois)
uvicorn main:app --reload --port 8000
```
Documentation interactive : http://localhost:8000/docs

3. Frontend (terminal 2)
```bash
cd frontend
npm install
npm run dev
```
Application : http://localhost:5173

## Parcours de démonstration
1. « Trouver un médecin » : filtrer, puis « Voir les disponibilités ».
2. Choisir un jour, une heure, **En ligne**, entrer ses coordonnées, réserver.
3. « Espace médecin » : choisir le même médecin et cliquer sur **Confirmer**.
4. « Mes rendez-vous » : le bouton **Rejoindre la visite** apparaît (lien Jitsi unique).

La variable `MODE_DEMO` dans `frontend/src/api.js` vaut `true` pour que le bouton soit actif
dès la confirmation. Mets `false` pour qu'il ne s'active que 10 minutes avant le rendez-vous.

## Base de données : `tabib_db`
| Collection    | Contenu |
|---------------|---------|
| `medecins`    | nom, spécialité, ville, tarif, note, langues, jours et heures de consultation, visite en ligne oui/non |
| `patients`    | nom, e-mail, téléphone |
| `rendez_vous` | médecin, patient, date, heure, mode (cabinet / en_ligne), motif, statut, lien_visio |

Statuts : `demande` → `confirme` → `termine` (ou `annule`).

## API REST
| Méthode | Route                          | Rôle |
|---------|--------------------------------|------|
| GET     | /medecins                      | Lister (filtres : q, specialite, ville, en_ligne) |
| GET     | /medecins/{id}                 | Fiche d'un médecin |
| GET     | /medecins/{id}/creneaux?date=  | Créneaux libres ou pris d'un jour |
| GET     | /filtres                       | Spécialités et villes disponibles |
| POST    | /patients                      | Créer un patient (ou le retrouver par e-mail) |
| POST    | /rendez-vous                   | Réserver (refuse un créneau déjà pris) |
| GET     | /rendez-vous                   | Lister (filtres : patient_id, medecin_id) |
| PUT     | /rendez-vous/{id}/statut       | Confirmer, annuler ou terminer |
| GET     | /stats?medecin_id=             | Statistiques du médecin |

## Limites de cette version (à citer comme pistes d'amélioration)
- Pas de mot de passe : l'espace médecin est une démo où l'on choisit le médecin.
- La visite vidéo s'ouvre dans un nouvel onglet (Jitsi) au lieu d'être intégrée à la page.
