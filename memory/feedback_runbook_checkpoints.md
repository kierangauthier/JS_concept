---
name: Runbook autonome — canal de réponse Kieran vs canal Teams
description: Distinction entre le canal Teams (notification) et la session Claude VM (là où Kieran doit réellement répondre GO) pour débloquer un checkpoint
type: feedback
---

Quand un runbook Claude-VM demande une validation humaine à Kieran via `teams-alert critical "✋ CHECKPOINT ..."`, le message Teams est **uniquement une notification**. Le helper `teams-alert` est **write-only** : il poste via webhook Power Automate et ne peut pas lire les réponses dans le canal.

**Pour réellement débloquer Claude-VM, Kieran doit répondre directement dans la session Claude-VM** (terminal/SSH où tourne `claude`), pas dans le canal Teams.

**Why:** Le 2026-04-23, Claude-VM a posé un checkpoint en Phase 0 avec `teams-alert critical "✋ CHECKPOINT 0 ... Réponds GO dans #acreed-alerts-critical"`. Kieran a répondu dans Teams → Claude-VM l'a explicitement dit : « Je n'ai pas accès à #acreed-alerts-critical en lecture — le helper teams-alert est write-only. ». Il a fallu recoller la réponse dans la session Claude-VM.

**How to apply:**

1. **Quand je rédige un runbook** pour Claude-VM :
   - Toujours préciser dans le message de checkpoint : *« Réponds GO directement dans cette session Claude-VM (pas dans Teams qui n'est qu'une notif). »*
   - Teams reste utile pour : notification mobile, historique, traçabilité d'audit.
   - Format de message recommandé :
     ```
     teams-alert critical "✋ CHECKPOINT X : [action requise côté Kieran]. Poste GO dans la session Claude-VM quand fait (ce canal Teams est write-only)."
     ```

2. **Option bidirectionnelle (à explorer plus tard)** : si on veut vraiment des réponses via Teams, il faudrait un mécanisme de type Microsoft Graph API avec un bot lisant le canal, ou un endpoint HTTP exposé sur la VM qui attend un webhook de retour. Pas pour tout de suite — trop d'ingénierie pour le bénéfice.

3. **Quand Kieran me demande de traduire un message de Claude-VM** : lui rappeler cette distinction et lui fournir le bloc de réponse à coller **dans la session Claude-VM**, pas dans Teams.

Règle simple pour Kieran : *« Teams notifie, la session débloque. »*
