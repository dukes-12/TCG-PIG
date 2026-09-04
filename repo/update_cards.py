import os
import json

dossier_images = "./public/assets/cards"
chemin_json = "./src/data/cards.json"

print("--- Début de l'annulation ---")

# 1. RESTAURER LES FICHIERS IMAGES (-1)
# On boucle dans l'ordre croissant (de 185 à 276) pour ne pas écraser les fichiers
for i in range(185, 277):
    ancien_nom = f"{i}.jpg"
    nouveau_nom = f"{i-1}.jpg"
    
    ancien_chemin = os.path.join(dossier_images, ancien_nom)
    nouveau_chemin = os.path.join(dossier_images, nouveau_nom)
    
    if os.path.exists(ancien_chemin):
        os.rename(ancien_chemin, nouveau_chemin)
        print(f" Image restaurée : {ancien_nom} -> {nouveau_nom}")

# 2. RESTAURER LE FICHIER JSON
if os.path.exists(chemin_json):
    with open(chemin_json, 'r', encoding='utf-8') as f:
        data = json.load(f)

    modifications = 0
    for card in data['cards']:
        # On cible les cartes qui avaient été modifiées (185 à 276)
        if 185 <= card['id'] <= 276:
            ancien_id = card['id']
            nouvel_id = ancien_id - 1
            
            card['id'] = nouvel_id
            card['slotId'] = f"art-{nouvel_id}"
            card['image'] = f"assets/cards/{nouvel_id}.jpg"
            
            if str(ancien_id) in card['name']:
                card['name'] = card['name'].replace(str(ancien_id), str(nouvel_id))
            
            modifications += 1

    with open(chemin_json, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f" Fichier JSON restauré ({modifications} cartes annulées).")
else:
    print(f" Erreur : Fichier introuvable -> {chemin_json}")

print("--- Annulation terminée ! ---")
