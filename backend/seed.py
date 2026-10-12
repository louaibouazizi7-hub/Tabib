"""Insère des médecins FICTIFS dans MongoDB (une seule fois)."""
import os

from pymongo import MongoClient

col = MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))["tabib_db"]["medecins"]

SEMAINE = [0, 1, 2, 3, 4]  # lundi à vendredi


def m(nom, specialite, ville, tarif, note, experience, langues, bio, en_ligne, jours=SEMAINE,
      debut="09:00", fin="17:00", duree=30):
    return {
        "nom": nom, "specialite": specialite, "ville": ville, "tarif": tarif, "note": note,
        "experience": experience, "langues": langues, "bio": bio, "en_ligne": en_ligne,
        "jours": jours, "debut": debut, "fin": fin, "duree": duree,
        "pause_debut": "12:30", "pause_fin": "14:00",
    }


if col.count_documents({}) > 0:
    print("La base contient déjà des médecins : rien n'a été inséré.")
else:
    col.insert_many([
        m("Dr Amel Ben Salah", "Cardiologue", "Tunis", 80, 4.9, 15, ["Français", "Arabe"],
          "Suivi de l'hypertension, bilan cardiaque et prévention.", True),
        m("Dr Karim Trabelsi", "Généraliste", "Sfax", 40, 4.7, 9, ["Français", "Arabe", "Anglais"],
          "Médecine de famille, certificats et suivi des maladies chroniques.", True, [0, 1, 2, 3, 4, 5]),
        m("Dr Sarra Mansouri", "Dermatologue", "Sousse", 60, 4.8, 11, ["Français", "Arabe"],
          "Acné, eczéma, grains de beauté et soins de la peau.", True, [1, 2, 3, 4]),
        m("Dr Mehdi Gharbi", "Pédiatre", "Tunis", 50, 4.9, 13, ["Français", "Arabe"],
          "Suivi de la croissance, vaccins et maladies de l'enfant.", True, duree=20),
        m("Dr Ines Khelifi", "Psychologue", "Nabeul", 70, 4.6, 7, ["Français", "Arabe", "Anglais"],
          "Stress, anxiété et accompagnement des adolescents.", True, [0, 2, 3, 4], "10:00", "18:00", 45),
        m("Dr Youssef Jlassi", "Ophtalmologue", "Monastir", 65, 4.5, 12, ["Français", "Arabe"],
          "Contrôle de la vue, lunettes et dépistage du glaucome.", False),
        m("Dr Rim Chaabane", "Gynécologue", "Bizerte", 75, 4.8, 14, ["Français", "Arabe"],
          "Suivi de grossesse, contraception et consultations de prévention.", True, [0, 1, 3, 4]),
        m("Dr Walid Dridi", "Dentiste", "Kairouan", 45, 4.4, 8, ["Français", "Arabe"],
          "Détartrage, soins des caries et urgences dentaires.", False, [0, 1, 2, 3, 4, 5], "08:30", "16:30"),
    ])
    print("8 médecins fictifs ajoutés dans tabib_db.medecins")
