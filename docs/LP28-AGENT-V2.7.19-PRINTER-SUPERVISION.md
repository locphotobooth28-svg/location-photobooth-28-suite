# LP28 Agent V2.7.19 — Supervision imprimantes

## Objectif

Même paquet pour les trois bornes **LOLA / NINA / GABIN**. Le module complète l'Agent LP28 existant sans remplacer sa configuration ni sa clé API.

- DNP DS620 + Hot Folder Print : lecture temps réel de `C:\DNP\HotFolderPrint\Logs\printer_status.txt`.
- Citizen / autre imprimante Windows : repli sur le spouleur Windows (`Get-Printer`).
- Envoi séparé de la télémétrie imprimante toutes les 5 secondes.
- Le heartbeat principal de la borne reste indépendant : une imprimante connectée ne peut pas faire passer artificiellement une borne hors ligne pour « en ligne ».

## Informations DNP remontées

Quand Hot Folder Print les fournit :

- modèle et nom ;
- code brut `Status` ;
- média (`4x6`, etc.) ;
- tirages restants ;
- compteur vie `LifeCounter` ;
- numéro de série ;
- firmware ;
- version Color Data ;
- fraîcheur du fichier HFP ;
- présence du processus Hot Folder Print.

### Codes confirmés sur la DS620 LP28

| Code HFP brut | LP28 | Couleur |
| --- | --- | --- |
| `STATUS_OK` | Prête | 🟢 |
| `STATUS_COVEROPEN` | Capot ouvert | 🟠 clignotant |

Les autres codes sont toujours conservés **bruts**. L'agent utilise des familles sémantiques (`PAPER`, `RIBBON`, `JAM`, `TEMP`, `HEAD`, `SYSTEM`, etc.) pour fournir une traduction, mais ne remplace jamais le code DNP original par un code inventé.

## Affichage LP28 Admin

Affichage volontairement compact :

```text
🖨️ Imprimante : 🟢 DS620
📄 Papier : 236
📐 Média : 4x6
```

Avertissement :

```text
🖨️ Imprimante : 🟠 DS620
⚠️ STATUS_COVEROPEN — Capot ouvert
```

Erreur bloquante / inconnue :

```text
🖨️ Imprimante : 🔴 DS620
⛔ CODE_DNP_BRUT — diagnostic LP28
```

Orange et rouge clignotent. Au retour à `STATUS_OK`, le voyant redevient vert et une notification de rétablissement est créée.

## Alertes

Le serveur compare le nouvel état avec le précédent afin d'éviter le spam :

- transition vers WARNING : notification admin ;
- transition vers ERROR : notification urgente ;
- retour à un état normal : notification de rétablissement ;
- même erreur répétée : pas de nouvelle notification à chaque cycle de 5 s.

## Installation sur une borne

Pré-requis : l'Agent LP28 principal doit déjà être installé dans :

`C:\LP28-Agent-Pack\LP28-Agent-Pack.ps1`

La configuration existante reste dans :

`%LOCALAPPDATA%\LP28BoothAgent\config.json`

Ne jamais transmettre `BOOTH_AGENT_API_KEY` dans un message ou un ticket. La valeur doit être renseignée localement depuis le secret Render.

Depuis le dossier contenant les deux scripts :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\INSTALL-LP28-V2.7.19-PRINTER-SUPERVISION.ps1 -BoothName LOLA
```

Changer uniquement le nom pour les autres bornes :

```powershell
... -BoothName NINA
... -BoothName GABIN
```

L'installateur :

1. vérifie la présence de l'Agent principal et de `config.json` ;
2. sauvegarde l'Agent et la configuration ;
3. installe `LP28-DNP-Supervision.ps1` ;
4. conserve le secret API existant ;
5. configure uniquement le nom de borne ;
6. ajoute `LP28-Printer-Supervision.cmd` au démarrage Windows ;
7. démarre le module en arrière-plan.

Journal :

`%LOCALAPPDATA%\LP28BoothAgent\dnp-supervision.log`

## Test DNP recommandé avant déploiement général

Sur une DS620 :

1. HFP ouvert + imprimante prête → vérifier `STATUS_OK` / voyant vert ;
2. ouvrir le capot → vérifier `STATUS_COVEROPEN` / orange clignotant ;
3. refermer le capot → vérifier retour vert + notification de rétablissement ;
4. vérifier média, compteur, série et firmware dans LP28 Admin ;
5. vérifier qu'une coupure de l'Agent principal continue bien à faire passer la borne hors ligne, même si le module imprimante tourne encore.

## Température

Aucune température numérique n'est publiée dans LP28 Admin à ce stade. Les fichiers `CorrectTableData.csv` trouvés dans HFP sont des tables de correction température/humidité, pas une mesure temps réel de la tête thermique. Une information thermique ne doit être affichée que si une vraie télémétrie DNP est identifiée ultérieurement.
