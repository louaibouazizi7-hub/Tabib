import datetime as dt
import os
import re
import uuid
from typing import Literal

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient

app = FastAPI(title="Tabib API")

# CORS : autorise le frontend React (port 5173) à appeler cette API (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db = MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))["tabib_db"]
medecins = db["medecins"]
patients = db["patients"]
rendez_vous = db["rendez_vous"]

FORMAT_HEURE = "%H:%M"


# ---------- Outils ----------
def fmt(doc):
    doc["id"] = str(doc.pop("_id"))
    return doc


def to_oid(id: str):
    try:
        return ObjectId(id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Identifiant invalide")


def get_medecin(id: str):
    m = medecins.find_one({"_id": to_oid(id)})
    if not m:
        raise HTTPException(status_code=404, detail="Médecin introuvable")
    return m


def parse_date(texte: str) -> dt.date:
    try:
        return dt.date.fromisoformat(texte)
    except ValueError:
        raise HTTPException(status_code=400, detail="Date invalide (format AAAA-MM-JJ)")


def horaires(m: dict, jour: dt.date) -> list[str]:
    """Liste des heures de début de consultation d'un médecin pour un jour donné."""
    if jour.weekday() not in m["jours"]:
        return []
    debut = dt.datetime.combine(jour, dt.datetime.strptime(m["debut"], FORMAT_HEURE).time())
    fin = dt.datetime.combine(jour, dt.datetime.strptime(m["fin"], FORMAT_HEURE).time())
    pause_d = dt.datetime.strptime(m.get("pause_debut", "00:00"), FORMAT_HEURE).time()
    pause_f = dt.datetime.strptime(m.get("pause_fin", "00:00"), FORMAT_HEURE).time()
    pas = dt.timedelta(minutes=m["duree"])
    resultat, courant = [], debut
    while courant + pas <= fin:
        if not (pause_d <= courant.time() < pause_f):
            resultat.append(courant.strftime(FORMAT_HEURE))
        courant += pas
    return resultat


# ---------- Médecins ----------
@app.get("/filtres")
def filtres():
    return {
        "specialites": sorted(medecins.distinct("specialite")),
        "villes": sorted(medecins.distinct("ville")),
    }


@app.get("/medecins")
def lister_medecins(
    q: str = "", specialite: str = "", ville: str = "", en_ligne: bool | None = None
):
    filtre: dict = {}
    if q:
        motif = {"$regex": re.escape(q), "$options": "i"}
        filtre["$or"] = [{"nom": motif}, {"specialite": motif}]
    if specialite:
        filtre["specialite"] = specialite
    if ville:
        filtre["ville"] = ville
    if en_ligne:
        filtre["en_ligne"] = True
    return [fmt(d) for d in medecins.find(filtre).sort("note", -1)]


@app.get("/medecins/{id}")
def consulter_medecin(id: str):
    return fmt(get_medecin(id))


@app.get("/medecins/{id}/creneaux")
def creneaux(id: str, jour: str = Query(..., alias="date")):
    m = get_medecin(id)
    d = parse_date(jour)
    pris = {
        r["heure"]
        for r in rendez_vous.find(
            {"medecin_id": id, "date": d.isoformat(), "statut": {"$ne": "annule"}}
        )
    }
    maintenant = dt.datetime.now()
    resultat = []
    for h in horaires(m, d):
        debut = dt.datetime.combine(d, dt.datetime.strptime(h, FORMAT_HEURE).time())
        resultat.append({"heure": h, "libre": h not in pris and debut > maintenant})
    return resultat


# ---------- Patients ----------
class Patient(BaseModel):
    nom: str = Field(min_length=2, max_length=80)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)
    telephone: str = Field(default="", max_length=30)


@app.post("/patients", status_code=201)
def inscrire_patient(p: Patient):
    """Crée le patient, ou le retrouve s'il existe déjà (même e-mail)."""
    email = p.email.lower()
    existant = patients.find_one({"email": email})
    if existant:
        patients.update_one(
            {"_id": existant["_id"]}, {"$set": {"nom": p.nom, "telephone": p.telephone}}
        )
        return fmt(patients.find_one({"_id": existant["_id"]}))
    doc = {"nom": p.nom, "email": email, "telephone": p.telephone}
    patients.insert_one(doc)
    return fmt(doc)


@app.get("/patients/{id}")
def consulter_patient(id: str):
    p = patients.find_one({"_id": to_oid(id)})
    if not p:
        raise HTTPException(status_code=404, detail="Patient introuvable")
    return fmt(p)


# ---------- Rendez-vous ----------
class NouveauRdv(BaseModel):
    medecin_id: str
    patient_id: str
    date: str
    heure: str
    mode: Literal["cabinet", "en_ligne"] = "cabinet"
    motif: str = Field(default="", max_length=300)


class ChangementStatut(BaseModel):
    statut: Literal["demande", "confirme", "termine", "annule"]


@app.post("/rendez-vous", status_code=201)
def reserver(r: NouveauRdv):
    m = get_medecin(r.medecin_id)
    p = patients.find_one({"_id": to_oid(r.patient_id)})
    if not p:
        raise HTTPException(status_code=404, detail="Patient introuvable")

    jour = parse_date(r.date)
    if r.mode == "en_ligne" and not m["en_ligne"]:
        raise HTTPException(status_code=400, detail="Ce médecin ne propose pas de visite en ligne.")
    if r.heure not in horaires(m, jour):
        raise HTTPException(status_code=400, detail="Ce créneau n'existe pas pour ce médecin.")
    debut = dt.datetime.combine(jour, dt.datetime.strptime(r.heure, FORMAT_HEURE).time())
    if debut <= dt.datetime.now():
        raise HTTPException(status_code=400, detail="Ce créneau est déjà passé.")
    if rendez_vous.find_one(
        {"medecin_id": r.medecin_id, "date": jour.isoformat(), "heure": r.heure,
         "statut": {"$ne": "annule"}}
    ):
        raise HTTPException(status_code=409, detail="Ce créneau vient d'être réservé. Choisis-en un autre.")

    doc = {
        "medecin_id": r.medecin_id,
        "medecin_nom": m["nom"],
        "specialite": m["specialite"],
        "patient_id": r.patient_id,
        "patient_nom": p["nom"],
        "patient_telephone": p.get("telephone", ""),
        "date": jour.isoformat(),
        "heure": r.heure,
        "mode": r.mode,
        "motif": r.motif,
        "statut": "demande",
        "lien_visio": f"https://meet.jit.si/tabib-{uuid.uuid4().hex[:12]}" if r.mode == "en_ligne" else "",
        "cree_le": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    rendez_vous.insert_one(doc)
    return fmt(doc)


@app.get("/rendez-vous")
def lister_rdv(patient_id: str | None = None, medecin_id: str | None = None):
    filtre = {}
    if patient_id:
        filtre["patient_id"] = patient_id
    if medecin_id:
        filtre["medecin_id"] = medecin_id
    return [fmt(d) for d in rendez_vous.find(filtre).sort([("date", 1), ("heure", 1)])]


@app.put("/rendez-vous/{id}/statut")
def changer_statut(id: str, c: ChangementStatut):
    rdv = rendez_vous.find_one({"_id": to_oid(id)})
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")
    if rdv["statut"] in ("termine", "annule"):
        raise HTTPException(status_code=400, detail="Ce rendez-vous est déjà clos.")
    rendez_vous.update_one({"_id": rdv["_id"]}, {"$set": {"statut": c.statut}})
    return fmt(rendez_vous.find_one({"_id": rdv["_id"]}))


# ---------- Tableau de bord du médecin ----------
@app.get("/stats")
def stats(medecin_id: str):
    aujourdhui = dt.date.today().isoformat()
    actifs = ["demande", "confirme"]
    return {
        "aujourdhui": rendez_vous.count_documents(
            {"medecin_id": medecin_id, "date": aujourdhui, "statut": {"$in": actifs}}
        ),
        "a_venir": rendez_vous.count_documents(
            {"medecin_id": medecin_id, "date": {"$gte": aujourdhui}, "statut": {"$in": actifs}}
        ),
        "a_confirmer": rendez_vous.count_documents(
            {"medecin_id": medecin_id, "statut": "demande"}
        ),
        "en_ligne": rendez_vous.count_documents(
            {"medecin_id": medecin_id, "mode": "en_ligne", "date": {"$gte": aujourdhui}, "statut": {"$in": actifs}}
        ),
        "termines": rendez_vous.count_documents({"medecin_id": medecin_id, "statut": "termine"}),
    }
